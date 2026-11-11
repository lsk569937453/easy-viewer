import { useState } from "react";
import { useNodeDialogs } from "../hooks/useNodeDialogs";
import { useNodeMutations } from "../hooks/useNodeMutations";
import { useTabActions } from "../hooks/useTabActions";
import { useTreeState } from "../hooks/useTreeState";
import type { ConnectionSummary } from "../types/backend";
import type { Tab } from "../types/tab";
import type { TreeNode } from "../types/tree";
import ConnectionSidebar from "./database-viewer/ConnectionSidebar";
import CopyNodeDialog from "./database-viewer/dialogs/CopyNodeDialog";
import CreateBucketDialog from "./database-viewer/dialogs/CreateBucketDialog";
import CreateCollectionDialog from "./database-viewer/dialogs/CreateCollectionDialog";
import DeleteNodeDialog from "./database-viewer/dialogs/DeleteNodeDialog";
import RenameNodeDialog from "./database-viewer/dialogs/RenameNodeDialog";
import { createNodeContextMenuItems } from "./database-viewer/nodeContextMenu";
import NewConnectionModal from "./NewConnectionModal";
import TabPanel from "./TabPanel";

interface DatabaseViewerProps {
  connections: ConnectionSummary[];
  onConnectionUpdated: (baseConfigId: number) => void;
  onConnectionDeleted: () => Promise<void>;
}

function DatabaseViewer({
  connections,
  onConnectionUpdated,
  onConnectionDeleted,
}: DatabaseViewerProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<number | null>(
    null,
  );

  const tree = useTreeState(connections);
  const dialogs = useNodeDialogs();
  const tabActions = useTabActions({
    connections,
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    treeData: tree.treeData,
    setTreeData: tree.setTreeData,
    setOpenNodes: tree.setOpenNodes,
    handleToggleNode: tree.handleToggleNode,
  });
  const mutations = useNodeMutations({
    connections,
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    treeData: tree.treeData,
    setTreeData: tree.setTreeData,
    setOpenNodes: tree.setOpenNodes,
    openNodesRef: tree.openNodesRef,
    fetchNodeChildren: tree.fetchNodeChildren,
    nextLoadSeq: tree.nextLoadSeq,
    isLatestLoad: tree.isLatestLoad,
    refreshRootVersion: tree.refreshRootVersion,
    dialogs,
    openSqlEditorTabWithContent: tabActions.openSqlEditorTabWithContent,
    closeTabsUnderPath: tabActions.closeTabsUnderPath,
    onConnectionDeleted,
  });

  const handleEditConnection = (node: TreeNode) => {
    setEditingConnectionId(Number(node.id));
    setIsModalOpen(true);
  };

  // 新建连接：复用编辑弹窗的创建模式（editingId 为 null）
  const handleOpenCreateConnection = () => {
    setEditingConnectionId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConnectionId(null);
  };

  const handleConnectionModalSaveSuccess = (
    affectedId: number | null,
    _isEditMode: boolean,
  ) => {
    if (affectedId != null) {
      onConnectionUpdated(affectedId);
    } else {
      // 新建连接时后端不返回 id；刷新连接列表以展示新连接
      void onConnectionDeleted();
    }
  };

  // 仅 WebDAV 连接下的文件/文件夹节点提供右键菜单
  const buildNodeContextMenuItems = (node: TreeNode) =>
    createNodeContextMenuItems(node, connections, {
      copy: dialogs.openCopyDialog,
      rename: dialogs.openRenameDialog,
      remove: dialogs.openDeleteDialog,
    });

  // 选中态跟随当前 tab：tab id 带前缀，需回退到 tab.node / tab.sourceNodeId
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const selectedNodeId =
    (activeTab && "node" in activeTab ? activeTab.node?.id : undefined) ??
    (activeTab?.type === "sqlEditor" ? activeTab.sourceNodeId : undefined) ??
    null;

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 gap-2 md:grid-cols-[minmax(260px,300px)_1fr]">
      <ConnectionSidebar
        connections={connections}
        isRefreshing={tree.isRefreshing}
        treeData={tree.treeData}
        openNodes={tree.openNodes}
        selectedNodeId={selectedNodeId}
        onCreateConnection={handleOpenCreateConnection}
        onRowClick={tabActions.handleNodeActivate}
        onToggle={tree.handleToggleNode}
        onAction={mutations.handleTreeRowAction}
        onEditConnection={handleEditConnection}
        onDeleteConnection={dialogs.openDeleteDialog}
        nodeContextMenuItems={buildNodeContextMenuItems}
      />
      <TabPanel
        tabs={tabs}
        setTabs={setTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        connections={connections}
        treeData={tree.treeData}
        onQuerySaved={tabActions.updateQueryNodeNameInTree}
        onRedisKeyDeleted={tabActions.handleRedisKeyDeleted}
        onKafkaTopicDeleted={(node) =>
          tabActions.handleKafkaTopicDeleted(node, mutations.handleRefreshNode)
        }
      />
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveSuccess={handleConnectionModalSaveSuccess}
        editingId={editingConnectionId}
      />
      <DeleteNodeDialog
        dialogRef={dialogs.deleteModalRef}
        node={dialogs.nodeToDelete}
        onCancel={dialogs.closeDeleteDialog}
        onConfirm={mutations.handleConfirmDelete}
      />
      <CreateCollectionDialog
        dialogRef={dialogs.createCollectionModalRef}
        value={dialogs.newCollectionName}
        onChange={dialogs.setNewCollectionName}
        onCancel={dialogs.closeCreateCollectionDialog}
        onConfirm={mutations.handleConfirmCreateCollection}
      />
      <CreateBucketDialog
        dialogRef={dialogs.createBucketModalRef}
        value={dialogs.newBucketName}
        onChange={dialogs.setNewBucketName}
        onCancel={dialogs.closeCreateBucketDialog}
        onConfirm={mutations.handleConfirmCreateBucket}
      />
      <RenameNodeDialog
        dialogRef={dialogs.renameModalRef}
        node={dialogs.nodeToRename}
        value={dialogs.renameValue}
        onChange={dialogs.setRenameValue}
        onCancel={dialogs.closeRenameDialog}
        onConfirm={mutations.handleConfirmRename}
      />
      <CopyNodeDialog
        dialogRef={dialogs.copyModalRef}
        node={dialogs.nodeToCopy}
        value={dialogs.copyTargetDir}
        onChange={dialogs.setCopyTargetDir}
        onCancel={dialogs.closeCopyDialog}
        onConfirm={mutations.handleConfirmCopy}
      />
    </div>
  );
}

export default DatabaseViewer;
