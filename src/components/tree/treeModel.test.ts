import { FaDownload, FaEdit } from "react-icons/fa";
import { describe, expect, it } from "vitest";
import type {
  ChildNodeInfo,
  GetNodeIcon,
  RootNodeDescriptor,
  RowActionKey,
  TreeNode,
} from "../../types/tree";
import {
  collectSubtreeIds,
  createNodeId,
  filterTreeByQuery,
  findNodeInTree,
  findParentNode,
  flattenVisibleNodes,
  getRowActions,
  isNodeExpandable,
  mapChildList,
  pruneOpenNodes,
  removeNodeFromTree,
  shouldToggleOnActivate,
  syncRootsWithConnections,
  updateNodeInTree,
} from "./treeModel";

const stubIcon: GetNodeIcon = (type, iconName) =>
  `icon:${iconName || type || "default"}`;

const child = (
  name: string,
  iconName = "database",
  extra: Partial<ChildNodeInfo> = {},
): ChildNodeInfo => ({
  name,
  icon_name: iconName,
  description: "",
  ...extra,
});

const makeNode = (overrides: Partial<TreeNode> = {}): TreeNode => ({
  id: overrides.id ?? "node",
  name: overrides.name ?? "node",
  type: overrides.type ?? "default",
  path: overrides.path ?? [{ level: 1, config_value: "node" }],
  ...overrides,
});

describe("createNodeId", () => {
  it("编码特殊字符，用 / 作为层级分隔", () => {
    expect(createNodeId("3", "my db")).toBe("3/my%20db");
    expect(createNodeId("3", "a/b")).toBe("3/a%2Fb");
    expect(createNodeId("3/db", "tables")).toBe("3/db/tables");
  });

  it("嵌套 id 唯一，且不依赖兄弟下标", () => {
    const root = { id: "1", path: [{ level: 1, config_value: "1" }] };
    const first = mapChildList(root, [child("a"), child("b")], stubIcon);
    const second = mapChildList(root, [child("b"), child("a")], stubIcon);

    expect(first.map((node) => node.id)).toEqual(["1/a", "1/b"]);
    // 顺序变化后同一名字的 id 不变
    expect(second[0].id).toBe("1/b");
    expect(second[1].id).toBe("1/a");
    expect(new Set(first.map((node) => node.id)).size).toBe(2);
  });
});

describe("mapChildList", () => {
  const parent = {
    id: "1",
    path: [{ level: 1, config_value: "1" }],
  };

  it("文件夹保持 null 懒加载，文件为叶子空数组", () => {
    const nodes = mapChildList(
      parent,
      [child("bucket", "bucket"), child("a.txt", "textFile")],
      stubIcon,
    );

    expect(nodes[0].children).toBeNull();
    expect(nodes[1].children).toEqual([]);
  });

  it("path 逐级递增，error/isLoading 有默认值", () => {
    const nodes = mapChildList(parent, [child("db")], stubIcon);

    expect(nodes[0].path).toEqual([
      { level: 1, config_value: "1" },
      { level: 2, config_value: "db" },
    ]);
    expect(nodes[0].error).toBeNull();
    expect(nodes[0].isLoading).toBe(false);
    expect(nodes[0].icon).toBe("icon:database");
    expect(nodes[0].details).toContain("节点: db");
  });
});

describe("updateNodeInTree / findNodeInTree / findParentNode / collectSubtreeIds", () => {
  const tree = () => [
    makeNode({
      id: 1,
      name: "conn",
      children: [
        makeNode({
          id: "1/db",
          children: [makeNode({ id: "1/db/t", children: [] })],
        }),
      ],
    }),
  ];

  it("按 id 更新节点", () => {
    const updated = updateNodeInTree(tree(), "1/db", { isLoading: true });
    expect(findNodeInTree(updated, "1/db")?.isLoading).toBe(true);
  });

  it("未命中时保持原引用（便于跳过无变更分支）", () => {
    const original = tree();
    expect(updateNodeInTree(original, "not-exist", { isLoading: true })).toBe(
      original,
    );
  });

  it("父子关系与子树 id 收集", () => {
    expect(findParentNode(tree(), 1)).toBeNull();
    expect(findParentNode(tree(), "1/db")?.id).toBe(1);
    expect(findParentNode(tree(), "missing")).toBeUndefined();
    expect(
      collectSubtreeIds(
        makeNode({
          id: "1/db",
          children: [makeNode({ id: "1/db/t" })],
        }),
      ),
    ).toEqual(["1/db", "1/db/t"]);
  });
});

describe("syncRootsWithConnections", () => {
  interface TestConnection {
    id: number;
    name: string;
    description?: string;
    host: string;
    port: number;
  }

  const toRootDescriptor = (conn: TestConnection): RootNodeDescriptor => ({
    id: conn.id,
    name: conn.name,
    type: "mysql",
    description: conn.description,
    host: conn.host,
    port: conn.port,
    details: `ID: ${conn.id}`,
    path: [{ level: 1, config_value: String(conn.id) }],
  });

  const prevRoots: TreeNode[] = [
    makeNode({
      id: 1,
      name: "旧名字",
      type: "mysql",
      description: "d",
      host: "h1",
      port: 3306,
      children: [makeNode({ id: "1/db" })],
      version: "8.0",
      offline: false,
      isLoading: false,
    }),
  ];

  it("改名只刷新描述字段，保留已加载 children 与版本信息", () => {
    const result = syncRootsWithConnections(
      prevRoots,
      [{ id: 1, name: "新名字", description: "d2", host: "h1", port: 3306 }],
      toRootDescriptor,
    );

    expect(result.roots).toHaveLength(1);
    expect(result.roots[0].name).toBe("新名字");
    expect(result.roots[0].children).toEqual([makeNode({ id: "1/db" })]);
    expect(result.roots[0].version).toBe("8.0");
    expect(result.addedIds).toEqual([]);
    expect(result.removedIds).toEqual([]);
    expect(result.resetIds).toEqual([]);
  });

  it("新增连接进入 addedIds，删除连接进入 removedIds", () => {
    const added = syncRootsWithConnections(
      prevRoots,
      [
        { id: 1, name: "旧名字", host: "h1", port: 3306 },
        { id: 2, name: "新连接", host: "h2", port: 5432 },
      ],
      toRootDescriptor,
    );
    expect(added.addedIds).toEqual([2]);
    expect(added.roots[1].children).toBeNull();
    // 输出顺序遵循 connections 顺序
    expect(added.roots.map((node) => node.id)).toEqual([1, 2]);

    const removed = syncRootsWithConnections(added.roots, [], toRootDescriptor);
    expect(removed.removedIds).toEqual([1, 2]);
    expect(removed.roots).toEqual([]);
  });

  it("host/port 变化触发子树重置并计入 resetIds", () => {
    const result = syncRootsWithConnections(
      prevRoots,
      [{ id: 1, name: "旧名字", host: "h2", port: 3306 }],
      toRootDescriptor,
    );

    expect(result.resetIds).toEqual([1]);
    expect(result.roots[0].children).toBeNull();
  });

  it("首次挂载时全部根节点视为新增", () => {
    const result = syncRootsWithConnections(
      [],
      [{ id: 7, name: "a", host: "h", port: 1 }],
      toRootDescriptor,
    );
    expect(result.addedIds).toEqual([7]);
    expect(result.roots[0].children).toBeNull();
  });
});

describe("pruneOpenNodes", () => {
  it("按根 id 及其前缀清理展开键", () => {
    const openNodes = {
      "1": true,
      "1/db": true,
      "1/db/tables": true,
      "22/db": true,
    };
    expect(pruneOpenNodes(openNodes, [1])).toEqual({ "22/db": true });
    expect(pruneOpenNodes(openNodes, [])).toBe(openNodes);
    expect(pruneOpenNodes(openNodes, ["99"])).toBe(openNodes);
  });
});

describe("flattenVisibleNodes", () => {
  const roots: TreeNode[] = [
    makeNode({
      id: 1,
      name: "conn",
      children: [
        makeNode({
          id: "1/db",
          name: "db",
          children: [makeNode({ id: "1/db/t", children: [] })],
        }),
      ],
    }),
  ];

  it("折叠时只输出可见行", () => {
    const rows = flattenVisibleNodes(roots, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].depth).toBe(0);
    expect(rows[0].isOpen).toBe(false);
    expect(rows[0].isExpandable).toBe(true);
  });

  it("逐层展开后深度正确", () => {
    const rows = flattenVisibleNodes(roots, { "1": true, "1/db": true });
    expect(rows.map((row) => row.key)).toEqual(["1", "1/db", "1/db/t"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2]);
    expect(rows[2].parentId).toBe("1/db");
    expect(rows[2].hasChildren).toBe(false);
  });

  it("离线节点不可展开", () => {
    expect(isNodeExpandable(makeNode({ offline: true, children: null }))).toBe(
      false,
    );
    expect(
      isNodeExpandable(makeNode({ iconName: "column", children: null })),
    ).toBe(false);
    expect(
      isNodeExpandable(makeNode({ iconName: "singleQuery", children: null })),
    ).toBe(false);
    expect(isNodeExpandable(makeNode({ children: [] }))).toBe(false);
    expect(isNodeExpandable(makeNode({ children: null }))).toBe(true);
  });

  it("展开且加载中的节点追加占位行", () => {
    const loadingRoots: TreeNode[] = [
      makeNode({
        id: 1,
        name: "conn",
        isLoading: true,
        children: null,
      }),
    ];
    const rows = flattenVisibleNodes(loadingRoots, { "1": true });

    expect(rows).toHaveLength(2);
    expect(rows[1].isPlaceholder).toBe(true);
    expect(rows[1].node).toBeNull();
    expect(rows[1].depth).toBe(1);
  });

  it("singleTable 由 activate 自己 toggle", () => {
    expect(shouldToggleOnActivate("singleTable")).toBe(false);
    expect(shouldToggleOnActivate("tables")).toBe(true);
  });
});

describe("filterTreeByQuery", () => {
  const roots: TreeNode[] = [
    makeNode({
      id: 1,
      name: "MySQL 连接",
      description: "",
      children: [
        makeNode({
          id: "1/shop",
          name: "shop",
          description: "订单库",
          children: [
            makeNode({
              id: "1/shop/orders",
              name: "orders",
              description: "",
              children: [],
            }),
            makeNode({
              id: "1/shop/users",
              name: "users",
              description: "",
              children: [],
            }),
          ],
        }),
      ],
    }),
    makeNode({
      id: 2,
      name: "Redis 连接",
      description: "",
      children: null,
    }),
  ];

  it("命中保留祖先链并计数", () => {
    const result = filterTreeByQuery(roots, "orders");

    expect(result.matchCount).toBe(1);
    expect(result.roots.map((node) => node.id)).toEqual([1]);
    expect(
      result.roots[0].children?.[0]?.children?.map((node) => node.name),
    ).toEqual(["orders"]);
    expect(result.expanded).toEqual({ "1": true, "1/shop": true });
  });

  it("大小写不敏感，也匹配 description", () => {
    expect(filterTreeByQuery(roots, "ORDERS").matchCount).toBe(1);
    expect(filterTreeByQuery(roots, "订单").matchCount).toBe(1);
  });

  it("空查询返回原树，无命中返回空树", () => {
    const empty = filterTreeByQuery(roots, "   ");
    expect(empty.roots).toBe(roots);
    expect(empty.matchCount).toBe(0);

    const none = filterTreeByQuery(roots, "不存在的节点");
    expect(none.roots).toEqual([]);
    expect(none.matchCount).toBe(0);
  });
});

describe("getRowActions", () => {
  const keys = (node: TreeNode): RowActionKey[] =>
    getRowActions(node).map((action) => action.key);
  const titleOf = (node: TreeNode, key: RowActionKey): string | undefined =>
    getRowActions(node).find((action) => action.key === key)?.title;

  it("连接根节点：刷新 + 删除", () => {
    expect(keys(makeNode({ type: "mysql", iconName: "mysql" }))).toEqual([
      "refresh",
      "delete",
    ]);
  });

  it("S3/WebDAV 根节点多一个新增入口", () => {
    const s3 = makeNode({ type: "s3", iconName: "s3" });
    expect(keys(s3)).toEqual(["add", "refresh", "delete"]);
    expect(titleOf(s3, "add")).toBe("新增 Bucket");

    const webdav = makeNode({ type: "webdav", iconName: "webdav" });
    expect(keys(webdav)).toEqual(["add", "refresh", "delete"]);
    expect(titleOf(webdav, "add")).toBe("上传文件");
  });

  it("查询/文件夹类节点保留刷新与新增", () => {
    const query = makeNode({ iconName: "query" });
    expect(keys(query)).toEqual(["refresh", "add"]);
    expect(titleOf(query, "add")).toBe("新增");

    expect(keys(makeNode({ iconName: "tables" }))).toEqual(["refresh", "add"]);
    // column/primary 沿用新增通道生成 CREATE COLUMN SQL
    expect(keys(makeNode({ iconName: "column" }))).toEqual(["add"]);
    expect(keys(makeNode({ iconName: "primary" }))).toEqual(["add"]);
  });

  it("bucket 为上传 + 删除 Bucket", () => {
    const bucket = makeNode({ iconName: "bucket" });
    expect(keys(bucket)).toEqual(["refresh", "add", "delete"]);
    expect(titleOf(bucket, "add")).toBe("上传文件");
    expect(titleOf(bucket, "delete")).toBe("删除 Bucket");
  });

  it("单条查询只提供删除查询", () => {
    expect(keys(makeNode({ iconName: "singleQuery" }))).toEqual([
      "deleteQuery",
    ]);
  });

  it("folder 与 textFile 的下载动作使用 FaDownload", () => {
    const folder = makeNode({ iconName: "folder" });
    expect(keys(folder)).toEqual(["add", "download", "delete"]);
    expect(titleOf(folder, "download")).toBe("下载");
    expect(
      getRowActions(folder).find((action) => action.key === "download")?.icon,
    ).toBe(FaDownload);

    expect(keys(makeNode({ iconName: "textFile" }))).toEqual([
      "download",
      "delete",
    ]);
  });

  it("singleTable 提供编辑动作（编辑仍用 FaEdit）", () => {
    const table = makeNode({ iconName: "singleTable" });
    expect(keys(table)).toEqual(["edit"]);
    expect(getRowActions(table)[0].icon).toBe(FaEdit);
  });

  it("其它类型不再渲染无行为的“信息”按钮", () => {
    expect(keys(makeNode({ iconName: "kafka_topics" }))).toEqual([]);
    expect(keys(makeNode({ iconName: "database" }))).toEqual([
      "refresh",
      "add",
    ]);
  });

  it("加载失败的节点补一个重试入口", () => {
    // 已有刷新按钮的节点无需额外重试（刷新即重试）
    expect(
      titleOf(makeNode({ iconName: "columns", error: "boom" }), "refresh"),
    ).toBe("刷新");
    // 没有刷新按钮的节点补"重试"
    const failed = makeNode({
      iconName: "singleTable",
      error: "boom",
      isLoading: false,
    });
    expect(keys(failed)).toEqual(["refresh", "edit"]);
    expect(titleOf(failed, "refresh")).toBe("重试");
  });
});

describe("removeNodeFromTree", () => {
  const tree = (): TreeNode[] => [
    {
      id: 1,
      name: "root",
      type: "mysql",
      path: [{ level: 1, config_value: "1" }],
      children: [
        {
          id: "1/db",
          name: "db",
          type: "default",
          path: [
            { level: 1, config_value: "1" },
            { level: 2, config_value: "db" },
          ],
          children: [
            {
              id: "1/db/t",
              name: "t",
              type: "default",
              path: [],
            },
          ],
        },
        { id: "1/other", name: "other", type: "default", path: [] },
      ],
    },
  ];

  it("移除孙节点后保留其祖先与兄弟", () => {
    const next = removeNodeFromTree(tree(), "1/db/t");
    expect(next[0].children?.[0].children).toEqual([]);
    expect(next[0].children).toHaveLength(2);
  });

  it("移除根节点得到空数组", () => {
    expect(removeNodeFromTree(tree(), 1)).toEqual([]);
  });

  it("未命中时返回原引用", () => {
    const roots = tree();
    expect(removeNodeFromTree(roots, "missing")).toBe(roots);
    expect(removeNodeFromTree(null, "x")).toEqual([]);
  });
});
