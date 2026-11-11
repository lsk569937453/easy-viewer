import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, type Mock, vi } from "vitest";
import type { OpenNodes, TreeNode, VisibleTreeRow } from "../../types/tree";
import TreeRow from "./TreeRow";
import { flattenVisibleNodes } from "./treeModel";

// TreeRow 是无副作用的展示组件，这里用 SSR 渲染验证各分支的 DOM 输出
const rowOf = (node: TreeNode, openNodes: OpenNodes = {}): VisibleTreeRow => {
  const row = flattenVisibleNodes([node], openNodes).find(
    (candidate) => candidate.node?.id === node.id,
  );
  if (!row) throw new Error(`未找到节点 ${String(node.id)} 的可见行`);
  return row;
};

const makeNode = (overrides: Partial<TreeNode> = {}): TreeNode => ({
  id: overrides.id ?? "node",
  name: overrides.name ?? "node",
  type: overrides.type ?? "default",
  path: overrides.path ?? [{ level: 1, config_value: "1" }],
  ...overrides,
});

const baseProps = {
  selectedNodeId: null,
  onRowClick: (_row: VisibleTreeRow) => {},
  onAction: (_node: TreeNode, _key: string) => {},
  nodeContextMenuItems: (_node: TreeNode) => null,
  onEditConnection: (_node: TreeNode) => {},
  onDeleteConnection: (_node: TreeNode) => {},
};

describe("TreeRow", () => {
  it("根节点渲染连接名、版本徽章与 treeitem 语义", () => {
    const node = makeNode({
      id: 1,
      name: "本地 MySQL",
      type: "mysql",
      iconName: "mysql",
      icon: "ICON",
      description: "",
      version: "8.0.36",
      children: null,
    });

    const html = renderToStaticMarkup(
      <TreeRow row={rowOf(node)} {...baseProps} />,
    );

    expect(html).toContain('role="treeitem"');
    expect(html).toContain('id="tree-item-1"');
    expect(html).toContain("本地 MySQL");
    expect(html).toContain("8.0.36");
    // 未展开的根节点 aria-expanded=false
    expect(html).toContain('aria-expanded="false"');
  });

  it("不再对超长名字做 JS 截断（交给 CSS truncate）", () => {
    const longName = "这是一个非常非常长的节点名字用于验证不再手动截断";
    const node = makeNode({
      id: "1/db",
      name: longName,
      type: "default",
      iconName: "database",
      description: "",
      children: null,
    });

    const html = renderToStaticMarkup(
      <TreeRow row={rowOf(node, { "1/db": false })} {...baseProps} />,
    );

    expect(html).toContain(longName);
    expect(html).toContain("truncate");
  });

  it("file 节点渲染下载按钮且不再出现无行为的“信息”按钮", () => {
    const node = makeNode({
      id: "1/a.txt",
      name: "a.txt",
      type: "default",
      iconName: "textFile",
      description: "12 KB",
      children: [],
    });

    const html = renderToStaticMarkup(
      <TreeRow row={rowOf(node)} {...baseProps} />,
    );

    expect(html).toContain('title="下载"');
    expect(html).toContain('title="删除"');
    expect(html).not.toContain('title="信息"');
  });

  it("加载失败展示错误文案与重试动作", () => {
    const node = makeNode({
      id: "1/db",
      name: "db",
      type: "default",
      iconName: "singleTable",
      description: "",
      children: null,
      error: "连接超时",
    });

    const html = renderToStaticMarkup(
      <TreeRow row={rowOf(node)} {...baseProps} />,
    );

    expect(html).toContain("加载失败");
    expect(html).toContain('title="重试"');
  });

  it("搜索命中片段包 mark，动作点击只触发一次且不冒泡", () => {
    const node = makeNode({
      id: "1/orders",
      name: "orders",
      type: "default",
      iconName: "singleTable",
      description: "",
      children: null,
    });

    const onAction: Mock<(...args: unknown[]) => void> = vi.fn();
    const onRowClick: Mock<(...args: unknown[]) => void> = vi.fn();
    const row = rowOf(node);

    const html = renderToStaticMarkup(
      <TreeRow
        row={row}
        {...baseProps}
        query="ord"
        onAction={onAction}
        onRowClick={onRowClick}
      />,
    );

    expect(html).toContain("<mark");
    expect(html).toContain(">ord</mark>");
    // 渲染阶段不应触发任何回调
    expect(onAction).not.toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("占位行渲染加载文案", () => {
    const node = makeNode({
      id: "1",
      name: "conn",
      isLoading: true,
      children: null,
    });
    const row = flattenVisibleNodes([node], { "1": true })[1];

    const html = renderToStaticMarkup(<TreeRow row={row} {...baseProps} />);

    expect(html).toContain("加载中…");
  });
});
