import { FaDatabase, FaPlus } from "react-icons/fa";
import type { ConnectionSummary } from "../../types/backend";
import type {
  OpenNodes,
  RowActionKey,
  TreeNode,
  TreeNodeId,
} from "../../types/tree";
import type { ContextMenuItem } from "../ContextMenuWrapper";
import TreeSidebar from "../tree/TreeSidebar";
import ActionButton from "../ui/ActionButton";
import Panel from "../ui/Panel";
import StatusChip from "../ui/StatusChip";
import { EmptyState } from "../ui/states";

interface ConnectionSidebarProps {
  connections: ConnectionSummary[];
  isRefreshing: boolean;
  treeData: TreeNode[];
  openNodes: OpenNodes;
  selectedNodeId: TreeNodeId | null;
  onCreateConnection: () => void;
  onRowClick: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
  onAction: (node: TreeNode, actionKey: RowActionKey) => void;
  onEditConnection: (node: TreeNode) => void;
  onDeleteConnection: (node: TreeNode) => void;
  nodeContextMenuItems?: ((node: TreeNode) => ContextMenuItem[] | null) | null;
}

/** 左侧连接面板：标题栏计数、刷新遮罩、连接树 / 空状态。 */
function ConnectionSidebar({
  connections,
  isRefreshing,
  treeData,
  openNodes,
  selectedNodeId,
  onCreateConnection,
  onRowClick,
  onToggle,
  onAction,
  onEditConnection,
  onDeleteConnection,
  nodeContextMenuItems,
}: ConnectionSidebarProps) {
  return (
    <Panel className="relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex h-9 flex-shrink-0 items-center justify-between gap-2 border-b border-hairline px-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-micro font-medium tracking-wider text-base-content/45">
            连接
          </span>
          {connections.length > 0 ? (
            <StatusChip>{connections.length}</StatusChip>
          ) : null}
        </div>
        <button
          type="button"
          className="app-icon-btn h-6 w-6"
          title="新建连接"
          aria-label="新建连接"
          onClick={onCreateConnection}
        >
          <FaPlus size="0.7em" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {isRefreshing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-base-100/80">
            <span className="loading loading-spinner loading-md text-primary"></span>
            <span className="text-micro text-base-content/50">
              正在检测连接状态…
            </span>
          </div>
        )}
        {treeData && treeData.length > 0 ? (
          <TreeSidebar
            roots={treeData}
            openNodes={openNodes}
            selectedNodeId={selectedNodeId}
            onRowClick={onRowClick}
            onToggle={onToggle}
            onAction={onAction}
            onEditConnection={onEditConnection}
            onDeleteConnection={onDeleteConnection}
            nodeContextMenuItems={nodeContextMenuItems}
          />
        ) : (
          <EmptyState
            className="flex-1"
            icon={<FaDatabase size="1.6em" />}
            title="还没有连接"
            description="添加 MySQL、Redis、Kafka 或 S3 连接，就能在左侧浏览数据。"
            action={
              <ActionButton
                variant="primary"
                size="sm"
                icon={<FaPlus size="0.75em" aria-hidden="true" />}
                onClick={onCreateConnection}
              >
                新建连接
              </ActionButton>
            }
          />
        )}
      </div>
    </Panel>
  );
}

export default ConnectionSidebar;
