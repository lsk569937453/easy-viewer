import type { ConnectionSummary } from "../../types/backend";
import { CONNECTION_TYPE_VALUES } from "../../types/generated/databaseTypes";
import type { TreeNode } from "../../types/tree";
import { findConnectionByRootConfigId } from "../../utils/treeConnection";

export interface NodeContextMenuActions {
  copy: (node: TreeNode) => void;
  rename: (node: TreeNode) => void;
  remove: (node: TreeNode) => void;
}

/** 仅 WebDAV 连接下的文件/文件夹节点提供右键菜单。 */
export const createNodeContextMenuItems = (
  node: TreeNode,
  connections: ConnectionSummary[],
  actions: NodeContextMenuActions,
) => {
  if (node.iconName !== "folder" && node.iconName !== "textFile") return null;
  const connection = findConnectionByRootConfigId(
    connections,
    node.path?.[0]?.config_value,
  );
  if (connection?.connection_type !== CONNECTION_TYPE_VALUES.WEBDAV)
    return null;
  return [
    { label: "复制到其他目录...", onClick: () => actions.copy(node) },
    { label: "重命名...", onClick: () => actions.rename(node) },
    { label: "删除", onClick: () => actions.remove(node) },
  ];
};
