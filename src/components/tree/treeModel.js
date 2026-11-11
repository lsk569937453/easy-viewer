/**
 * 左侧树的数据层纯函数集合：不依赖 React，便于直接单测。
 * 节点形状（TabPanel 等下游依赖，只增不删字段）：
 * { id, name, type, icon, iconName, description, details, children, path,
 *   error, isLoading, version?, offline? }
 */
import {
  FaDownload,
  FaEdit,
  FaPlus,
  FaSyncAlt,
  FaTrashAlt,
} from "react-icons/fa";

export const LEAF_ICON_NAMES = new Set(["textFile"]);

/** 这些节点类型由 handleNodeActivate 自己处理 toggle，行点击不要再额外 toggle */
export const SELF_TOGGLE_ICON_NAMES = ["singleTable"];

/** 有"刷新/新增"动作的节点类型 */
export const NODES_WITH_REFRESH_ADD = [
  "query",
  "tables",
  "views",
  "columns",
  "index",
  "partitions",
  "collections",
  "database",
  "bucket",
];

/** 有"编辑"动作的节点类型 */
export const NODES_WITH_EDIT = ["singleTable"];

/** 在"新增"通道上生成 SQL 模板的节点类型 */
export const NODES_WITH_ADD_ACTION = ["column", "primary"];

/** 根节点类型：命中即为连接根节点（可编辑/删除连接，带 version 徽章） */
export const ACTIONABLE_DB_TYPES = [
  "mysql",
  "sqlite",
  "postgresql",
  "oracle",
  "redis",
  "mongodb",
  "clickhouse",
  "s3",
  "elasticsearch",
  "kafka",
  "rocketmq",
  "webdav",
];

export const isRootNode = (node) =>
  !!node && ACTIONABLE_DB_TYPES.includes(node.type);

/**
 * 稳定节点 id：父 id + 编码后的名字。
 * 不引入兄弟下标，避免兄弟顺序变化导致 key/openNodes 错位；
 * encodeURIComponent 后名字里的 "/" 会变成 %2F，因此 "/" 天然是分隔符。
 */
export const createNodeId = (parentId, childName) =>
  `${parentId}/${encodeURIComponent(childName)}`;

/** 把后端 list_node_info 的子项数组映射为树节点数组 */
export const mapChildList = (parent, childList, getNodeIcon) =>
  (childList || []).map((child) => ({
    id: createNodeId(parent.id, child.name),
    name: child.name,
    type: child.type || "default",
    icon: getNodeIcon(child.type, child.icon_name),
    description: child.description || "",
    iconName: child.icon_name,
    details: `节点: ${child.name}\n类型: ${child.type || "未知"}`,
    // 文件节点是叶子：置为空数组避免显示展开箭头，文件夹保持 null 懒加载
    children: LEAF_ICON_NAMES.has(child.icon_name) ? [] : null,
    path: [
      ...parent.path,
      { level: parent.path.length + 1, config_value: child.name },
    ],
    error: null,
    isLoading: false,
  }));

/**
 * 按 id 更新单个节点；命中路径上的节点才重建，未命中的分支保持原引用，
 * 便于下游 memo / 虚拟滚动跳过无变更行。
 */
export const updateNodeInTree = (nodes, nodeId, updates) => {
  if (!Array.isArray(nodes)) return nodes;

  let changed = false;
  const next = nodes.map((node) => {
    if (node.id === nodeId) {
      changed = true;
      return { ...node, ...updates };
    }
    if (Array.isArray(node.children)) {
      const updatedChildren = updateNodeInTree(node.children, nodeId, updates);
      if (updatedChildren !== node.children) {
        changed = true;
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });

  return changed ? next : nodes;
};

/** 按 id 查找节点，未找到返回 null */
export const findNodeInTree = (nodes, nodeId) => {
  if (!Array.isArray(nodes)) return null;

  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (Array.isArray(node.children)) {
      const found = findNodeInTree(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
};

// 按节点 id 查找父节点；返回 null 表示是根节点，undefined 表示未找到
export const findParentNode = (nodes, nodeId, parent = null) => {
  for (const node of nodes) {
    if (node.id === nodeId) return parent;
    if (node.children) {
      const found = findParentNode(node.children, nodeId, node);
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

/** 收集节点自身及全部后代 id（用于清理失效的展开状态） */
export const collectSubtreeIds = (node) => {
  const ids = [node.id];
  if (node.children) {
    node.children.forEach((child) => ids.push(...collectSubtreeIds(child)));
  }
  return ids;
};

/**
 * 按 id 合并 connections 与已有根节点，避免全量重建导致已加载 children 丢失。
 * 返回 { roots, addedIds, removedIds, resetIds }：
 * - 同 id 根节点：保留 children/isLoading/展开态/version/offline/error，
 *   仅刷新 name/description/type/icon/details/path/host/port；
 *   host 或 port 变化时 children 置 null 并计入 resetIds（走懒加载重拉）
 * - 新连接：追加根节点（children: null），id 进 addedIds
 * - 消失的连接：移除根节点，id 进 removedIds
 * - 输出顺序遵循 connections 顺序
 */
export const syncRootsWithConnections = (
  prevRoots,
  connections,
  toRootDescriptor
) => {
  const prevList = Array.isArray(prevRoots) ? prevRoots : [];
  const prevById = new Map(prevList.map((node) => [String(node.id), node]));

  const addedIds = [];
  const resetIds = [];

  const roots = (connections || []).map((conn) => {
    const descriptor = toRootDescriptor(conn);
    const prevNode = prevById.get(String(descriptor.id));

    if (!prevNode) {
      addedIds.push(descriptor.id);
      return {
        ...descriptor,
        children: null,
        isLoading: false,
        error: null,
      };
    }

    const endpointChanged =
      prevNode.host !== descriptor.host || prevNode.port !== descriptor.port;

    const nextNode = {
      ...prevNode,
      name: descriptor.name,
      description: descriptor.description,
      type: descriptor.type,
      icon: descriptor.icon,
      iconName: descriptor.iconName,
      details: descriptor.details,
      path: descriptor.path,
      host: descriptor.host,
      port: descriptor.port,
    };

    if (endpointChanged) {
      nextNode.children = null;
      nextNode.isLoading = false;
      nextNode.error = null;
      resetIds.push(descriptor.id);
    }

    return nextNode;
  });

  const nextIds = new Set(roots.map((node) => String(node.id)));
  const removedIds = prevList
    .filter((node) => !nextIds.has(String(node.id)))
    .map((node) => node.id);

  return { roots, addedIds, removedIds, resetIds };
};

/** 清理已删除根节点（含其整棵子树）在 openNodes 中的残留键 */
export const pruneOpenNodes = (openNodes, rootIds) => {
  if (!rootIds || rootIds.length === 0) return openNodes;

  const removedRootIds = new Set(rootIds.map((id) => String(id)));
  const prefixes = [...removedRootIds].map((id) => `${id}/`);

  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(openNodes || {})) {
    const stale =
      removedRootIds.has(key) || prefixes.some((prefix) => key.startsWith(prefix));
    if (stale) {
      changed = true;
      continue;
    }
    next[key] = value;
  }

  return changed ? next : openNodes;
};

/** 节点是否可以展开（离线、列/主键/已保存查询等叶子不显示展开箭头） */
export const isNodeExpandable = (node) => {
  if (!node) return false;
  if (node.offline === true) return false;
  if (
    node.iconName === "column" ||
    node.iconName === "primary" ||
    node.iconName === "singleQuery"
  ) {
    return false;
  }
  return (
    node.children === null ||
    (Array.isArray(node.children) && node.children.length > 0)
  );
};

/** 行点击时是否还需要额外 toggle（这些类型由 activate 内部处理） */
export const shouldToggleOnActivate = (iconName) =>
  !SELF_TOGGLE_ICON_NAMES.includes(iconName);

/**
 * 行内动作配置：由节点类型驱动，TreeRow 只负责渲染。
 * key ∈ refresh|add|edit|delete|deleteQuery|download，其中 download 沿用
 * onEdit 通道（S3/WebDAV 下载）。
 */
export const getRowActions = (node) => {
  if (!node) return [];

  const iconName = node.iconName;
  const actions = [];
  const hasRefresh = NODES_WITH_REFRESH_ADD.includes(iconName);
  const isRoot = isRootNode(node);

  // 加载失败且没有刷新按钮的节点，补一个"重试"入口
  if (node.error && !node.isLoading && !hasRefresh && !isRoot) {
    actions.push({ key: "refresh", title: "重试", icon: FaSyncAlt });
  }

  if (isRoot) {
    if (iconName === "s3") {
      actions.push({ key: "add", title: "新增 Bucket", icon: FaPlus });
    }
    if (iconName === "webdav") {
      actions.push({ key: "add", title: "上传文件", icon: FaPlus });
    }
    actions.push({ key: "refresh", title: "刷新", icon: FaSyncAlt });
    actions.push({ key: "delete", title: "删除", icon: FaTrashAlt });
    return actions;
  }

  if (iconName === "singleQuery") {
    actions.push({ key: "deleteQuery", title: "删除查询", icon: FaTrashAlt });
    return actions;
  }

  if (hasRefresh) {
    actions.push({ key: "refresh", title: "刷新", icon: FaSyncAlt });
  }

  if (iconName === "bucket") {
    actions.push({ key: "add", title: "上传文件", icon: FaPlus });
    actions.push({ key: "delete", title: "删除 Bucket", icon: FaTrashAlt });
    return actions;
  }

  if (iconName === "folder") {
    actions.push({ key: "add", title: "上传文件", icon: FaPlus });
    actions.push({ key: "download", title: "下载", icon: FaDownload });
    actions.push({ key: "delete", title: "删除", icon: FaTrashAlt });
    return actions;
  }

  if (iconName === "textFile") {
    actions.push({ key: "download", title: "下载", icon: FaDownload });
    actions.push({ key: "delete", title: "删除", icon: FaTrashAlt });
    return actions;
  }

  if (hasRefresh || NODES_WITH_ADD_ACTION.includes(iconName)) {
    actions.push({ key: "add", title: "新增", icon: FaPlus });
  }

  if (NODES_WITH_EDIT.includes(iconName)) {
    actions.push({ key: "edit", title: "编辑", icon: FaEdit });
  }

  return actions;
};

/**
 * DFS 展平"当前可见"节点：跳过未展开节点的 children。
 * 返回 [{ key, node, depth, parentId, hasChildren, isExpandable, isOpen }]
 */
export const flattenVisibleNodes = (roots, openNodes) => {
  const rows = [];

  const walk = (nodes, parentId, depth) => {
    for (const node of nodes || []) {
      const hasChildren =
        Array.isArray(node.children) && node.children.length > 0;
      const isOpen = !!openNodes?.[node.id];

      rows.push({
        key: String(node.id),
        node,
        depth,
        parentId,
        hasChildren,
        isExpandable: isNodeExpandable(node),
        isOpen,
      });

      if (isOpen && hasChildren) {
        walk(node.children, node.id, depth + 1);
      }
    }
  };

  walk(roots, null, 0);
  return rows;
};

/**
 * 按 name + description 做大小写不敏感的子串匹配。
 * 命中节点标记 _matched；祖先链保留并计入 expanded（供过滤态强制展开，
 * 调用方不得写回 openNodes）。
 * 返回 { roots, matchCount, expanded }
 */
export const filterTreeByQuery = (roots, query) => {
  const keyword = (query || "").trim().toLowerCase();
  if (!keyword) {
    return { roots: roots || [], matchCount: 0, expanded: {} };
  }

  const expanded = {};
  let matchCount = 0;

  const isMatch = (node) =>
    `${node.name ?? ""} ${node.description ?? ""}`
      .toLowerCase()
      .includes(keyword);

  const walk = (nodes) => {
    const kept = [];
    for (const node of nodes || []) {
      const selfMatched = isMatch(node);
      const matchedChildren = Array.isArray(node.children)
        ? walk(node.children)
        : [];

      if (!selfMatched && matchedChildren.length === 0) continue;

      const nextNode = { ...node };
      if (selfMatched) {
        nextNode._matched = true;
        matchCount += 1;
      }
      if (matchedChildren.length > 0) {
        nextNode.children = matchedChildren;
        expanded[String(node.id)] = true;
      }
      kept.push(nextNode);
    }
    return kept;
  };

  return { roots: walk(roots), matchCount, expanded };
};


