import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import type { ListNodeInfoResponseItem } from "./backend";

export type TreeNodeId = string | number;

export interface TreeNodePathSegment {
  level: number;
  config_value: string;
}

/**
 * 左侧树节点。字段形状与 `treeModel` 头注释一致（TabPanel 等下游依赖，只增不删）。
 */
export interface TreeNode {
  id: TreeNodeId;
  name: string;
  type: string;
  icon?: ReactNode;
  iconName?: string;
  description?: string | null;
  details?: string;
  children?: TreeNode[] | null;
  path: TreeNodePathSegment[];
  error?: string | null;
  isLoading?: boolean;
  version?: string | null;
  offline?: boolean;
  host?: string | null;
  port?: number | null;
  _matched?: boolean;
}

export type TreeNodePatch = Partial<Omit<TreeNode, "id">>;

/** syncRootsWithConnections 的根节点描述（不含 children 等运行时状态）。 */
export interface RootNodeDescriptor {
  id: TreeNodeId;
  name: string;
  type: string;
  icon?: ReactNode;
  iconName?: string;
  description?: string | null;
  host?: string | null;
  port?: number | null;
  details?: string;
  path: TreeNodePathSegment[];
}

export interface VisibleTreeRow {
  key: string;
  node: TreeNode | null;
  depth: number;
  parentId: TreeNodeId | null;
  hasChildren: boolean;
  isExpandable: boolean;
  isOpen: boolean;
  isPlaceholder: boolean;
}

export type RowActionKey =
  | "refresh"
  | "add"
  | "edit"
  | "download"
  | "delete"
  | "deleteQuery";

export interface RowAction {
  key: RowActionKey;
  title: string;
  icon: IconType;
}

export type OpenNodes = Record<string, boolean>;

/** list_node_info 子项中前端真正消费的字段。 */
export type ChildNodeInfo = Pick<
  ListNodeInfoResponseItem,
  "name" | "icon_name" | "description"
>;

export interface TreeFilterResult {
  roots: TreeNode[];
  matchCount: number;
  expanded: OpenNodes;
}

export interface SyncRootsResult {
  roots: TreeNode[];
  addedIds: TreeNodeId[];
  removedIds: TreeNodeId[];
  resetIds: TreeNodeId[];
}

export type GetNodeIcon = (
  nodeType?: string | null,
  iconName?: string | null,
) => ReactNode;
