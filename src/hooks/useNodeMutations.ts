import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { deleteConnection } from "../api/connections";
import { fetchDdlTemplate } from "../api/ddl";
import { createKafkaTopic } from "../api/kafka";
import { removeQuery } from "../api/queries";
import {
  copyObject,
  createBucket,
  createCollection,
  deleteBucket,
  downloadNodeFile,
  listNodeInfo,
  renameObject,
} from "../api/tree";
import { getNodeIcon } from "../components/tree/nodeIcons";
import {
  collectSubtreeIds,
  findParentNode,
  isRootNode,
  mapChildList,
  removeNodeFromTree,
  updateNodeInTree,
} from "../components/tree/treeModel";
import type { ConnectionSummary, ListNodeInfoResponse } from "../types/backend";
import { descriptorByConnectionType } from "../types/generated/databaseTypes";
import type { SetActiveTabId, SetTabs, Tab } from "../types/tab";
import type { OpenNodes, RowActionKey, TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import { findConnectionByRootConfigId } from "../utils/treeConnection";
import type { NodeDialogs } from "./useNodeDialogs";

interface NodeMutationParams extends TreeSlice, TabSlice, DialogSlice {}

/**
 * 变异上下文按职责分组，避免「一个 16 字段的平行参数表」随功能增长继续膨胀。
 *
 * 分组只影响可读性与未来的局部替换：`NodeMutationParams` 由三组 compose 而成，
 * 调用方无需改写（`DatabaseViewer` 仍然一次性传一个对象）。
 */
interface TreeSlice {
  connections: ConnectionSummary[];
  treeData: TreeNode[];
  setTreeData: Dispatch<SetStateAction<TreeNode[]>>;
  setOpenNodes: Dispatch<SetStateAction<OpenNodes>>;
  openNodesRef: RefObject<OpenNodes>;
  fetchNodeChildren: (node: TreeNode) => Promise<TreeNode[] | null>;
  nextLoadSeq: (nodeId: TreeNode["id"]) => number;
  isLatestLoad: (nodeId: TreeNode["id"], seq: number) => boolean;
  refreshRootVersion: (node: TreeNode) => Promise<void>;
}

interface TabSlice {
  tabs: Tab[];
  setTabs: SetTabs;
  activeTabId: string | null;
  setActiveTabId: SetActiveTabId;
  openSqlEditorTabWithContent: (
    connectionId: number,
    nodeIcon: ReactNode,
    generatedSql?: string,
    defaultName?: string,
    databaseName?: string,
  ) => Promise<boolean>;
  closeTabsUnderPath: (prefix: TreeNode["path"]) => void;
}

interface DialogSlice {
  dialogs: NodeDialogs;
  onConnectionDeleted: () => Promise<void>;
}

interface MutationContext extends NodeMutationParams {
  handleRefreshNode: (node: TreeNode) => Promise<void>;
}

export interface NodeMutations {
  handleRefreshNode: (node: TreeNode) => Promise<void>;
  handleAddNode: (node: TreeNode) => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
  handleConfirmRename: () => Promise<void>;
  handleConfirmCopy: () => Promise<void>;
  handleEditNode: (node: TreeNode) => Promise<void>;
  handleDeleteQuery: (node: TreeNode) => void;
  handleConfirmCreateCollection: () => Promise<void>;
  handleConfirmCreateBucket: () => Promise<void>;
  handleTreeRowAction: (node: TreeNode, actionKey: RowActionKey) => void;
}

const refreshNode = async (node: TreeNode, ctx: MutationContext) => {
  if (isRootNode(node)) {
    await ctx.refreshRootVersion(node);
  }

  const childNodes = await ctx.fetchNodeChildren(node);
  ctx.setOpenNodes((prev) => ({ ...prev, [node.id]: true }));

  // Re-fetch data for open children using raw invoke calls, then
  // update the tree in a SINGLE setTreeData to avoid React batching races.
  if (childNodes && childNodes.length > 0) {
    const currentOpenNodes = ctx.openNodesRef.current;
    const openChildren = childNodes.filter(
      (child) => currentOpenNodes[child.id],
    );

    if (openChildren.length > 0) {
      // 每个 child 独立取号：只有最后一次发起的加载可以写回
      const results = await Promise.all(
        openChildren.map(async (child) => {
          const seq = ctx.nextLoadSeq(child.id);
          try {
            const responseJson = await listNodeInfo({
              level_infos: child.path,
            });
            const { response_code, response_msg } =
              parseBaseResponse<ListNodeInfoResponse>(responseJson);
            if (response_code === 0) {
              return { child, list: response_msg.list, seq };
            }
            return {
              child,
              error: response_msg || "加载失败",
              seq,
            };
          } catch (err) {
            console.error("Failed to re-fetch child:", child.name, err);
            return { child, error: getErrorMessage(err), seq };
          }
        }),
      );

      // Update tree state ONCE with all results
      ctx.setTreeData((prevTree) => {
        let updated = prevTree;
        for (const result of results) {
          if (!ctx.isLatestLoad(result.child.id, result.seq)) continue;

          if (result.error) {
            updated = updateNodeInTree(updated, result.child.id, {
              children: null,
              isLoading: false,
              error: result.error,
            });
            continue;
          }

          const grandChildren = mapChildList(
            result.child,
            result.list,
            getNodeIcon,
          );
          updated = updateNodeInTree(updated, result.child.id, {
            children: grandChildren,
            isLoading: false,
            error: null,
          });
        }
        return updated;
      });
    }
  }
};

const openUploadTab = (node: TreeNode, ctx: MutationContext) => {
  const tabId = `s3-upload-${node.id}`;
  const existingTab = ctx.tabs.find((tab) => tab.id === tabId);
  if (existingTab) {
    ctx.setActiveTabId(tabId);
  } else {
    const newTab: Tab = {
      id: tabId,
      name: `上传到 ${node.name}`,
      icon: node.icon,
      type: "s3Upload",
      node: node,
    };
    ctx.setTabs((prevTabs) => [...prevTabs, newTab]);
    ctx.setActiveTabId(newTab.id);
  }
};

const addNode = async (node: TreeNode, ctx: MutationContext) => {
  const rootConfigId = node.path[0]?.config_value;
  const connection = findConnectionByRootConfigId(
    ctx.connections,
    rootConfigId,
  );

  if (!connection) {
    showError("无法找到数据库连接信息来执行此操作。");
    return;
  }

  const connectionId = parseInt(rootConfigId, 10);
  const connectionType = connection.connection_type;
  const dbType = descriptorByConnectionType(connectionType)?.dbType;
  if (!dbType) {
    showError(`未知的数据源类型（${connectionType}），无法生成 SQL。`);
    return;
  }
  const databaseName = node.path[1]?.config_value || "";
  let generatedSql = "";
  let defaultQueryName = "";

  if (node.iconName === "query") {
    // 查询节点不预生成 SQL，由下方统一打开空编辑器
  } else if (node.iconName === "tables") {
    const tableName = node.name;
    generatedSql = (await fetchDdlTemplate(dbType, tableName)).createTable;
    defaultQueryName = `Create_Table_${tableName}`;
  } else if (
    node.iconName === "columns" ||
    node.iconName === "column" ||
    node.iconName === "primary"
  ) {
    let tableName = "";
    if (node.iconName === "columns") {
      tableName = node.path[node.path.length - 2]?.config_value;
    } else if (node.iconName === "column" || node.iconName === "primary") {
      tableName = node.path[node.path.length - 3]?.config_value;
    }

    if (!tableName) {
      showError("无法确定表名来生成 CREATE COLUMN SQL。");
      return;
    }
    generatedSql = (await fetchDdlTemplate(dbType, tableName)).addColumn;
    defaultQueryName = `Add_Column_to_${tableName}`;
  } else if (node.iconName === "index") {
    const tableName = node.path[node.path.length - 2]?.config_value;
    if (!tableName) {
      showError("无法确定表名来生成 CREATE INDEX SQL。");
      return;
    }
    generatedSql = (await fetchDdlTemplate(dbType, tableName)).createIndex;
    defaultQueryName = `Add_Index_to_${tableName}`;
  } else if (node.iconName === "s3") {
    ctx.dialogs.openCreateBucketDialog(node);
    return;
  } else if (node.iconName === "webdav") {
    // WebDAV 根目录:打开上传面板
    openUploadTab(node, ctx);
    return;
  } else if (node.iconName === "bucket" || node.iconName === "folder") {
    // Bucket / 文件夹:打开上传面板
    openUploadTab(node, ctx);
    return;
  } else if (node.iconName === "kafka_topics") {
    // 创建新 Kafka Topic
    const topicName = prompt("请输入新 Topic 名称:");
    if (!topicName) return;

    const numPartitions = parseInt(
      prompt("请输入分区数 (默认 1):", "1") || "1",
      10,
    );
    const replicationFactor = parseInt(
      prompt("请输入副本因子 (默认 1):", "1") || "1",
      10,
    );

    try {
      const responseJson = await createKafkaTopic(
        connectionId,
        topicName,
        numPartitions,
        replicationFactor,
      );
      const { response_code, response_msg } =
        parseBaseResponse<unknown>(responseJson);

      if (response_code === 0) {
        showSuccess(`Topic "${topicName}" 创建成功!`);
        await ctx.handleRefreshNode(node);
      } else {
        showError(`创建 Topic 失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`创建 Topic 时发生错误: ${getErrorMessage(err)}`);
    }
    return;
  } else if (node.iconName === "collections") {
    ctx.dialogs.openCreateCollectionDialog(node);
    return;
  } else {
    showError(
      `触发了"新增"操作，目标节点: ${node.name}，但此节点类型不支持生成SQL。`,
    );
    return;
  }

  const success = await ctx.openSqlEditorTabWithContent(
    connectionId,
    node.icon,
    generatedSql,
    defaultQueryName,
    databaseName,
  );

  if (node.iconName === "query" && success) {
    await ctx.handleRefreshNode(node);
  }
};

const deleteQueryNode = async (node: TreeNode, ctx: MutationContext) => {
  const baseConfigId = node.path[0]?.config_value;
  const queryName = node.name;
  const queryId = node.path[node.path.length - 1]?.config_value;

  if (!baseConfigId || !queryName || !queryId) {
    showError("无法获取完整的查询信息来删除。");
    ctx.dialogs.closeDeleteDialog();
    return;
  }

  try {
    const databaseName = node.path[1]?.config_value || "";
    const responseJson = await removeQuery({
      baseConfigId: parseInt(baseConfigId, 10),
      queryName: queryName,
      databaseName,
    });
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);

    if (response_code === 0) {
      ctx.setTreeData((prevTree) => removeNodeFromTree(prevTree, node.id));

      ctx.setOpenNodes((prevOpenNodes) => {
        const newOpenNodes = { ...prevOpenNodes };
        delete newOpenNodes[node.id];
        return newOpenNodes;
      });

      ctx.setTabs((prevTabs) => {
        const remainingTabs = prevTabs.filter(
          (tab) =>
            !(
              tab.type === "sqlEditor" && tab.queryId === parseInt(queryId, 10)
            ),
        );
        if (
          ctx.activeTabId &&
          !remainingTabs.some((tab) => tab.id === ctx.activeTabId)
        ) {
          ctx.setActiveTabId(
            remainingTabs.length > 0 ? remainingTabs[0].id : null,
          );
        }
        return remainingTabs;
      });
    } else {
      console.error("Failed to delete query:", response_msg);
      showError(`删除查询失败: ${response_msg}`);
    }
  } catch (err) {
    console.error("Error invoking remove_query:", err);
    showError(`删除查询时发生错误: ${getErrorMessage(err)}`);
  } finally {
    ctx.dialogs.closeDeleteDialog();
  }
};

const deleteBucketNode = async (node: TreeNode, ctx: MutationContext) => {
  try {
    const responseJson = await deleteBucket({ level_infos: node.path });
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);

    if (response_code === 0) {
      ctx.setTreeData((prevTree) => removeNodeFromTree(prevTree, node.id));

      ctx.setOpenNodes((prev) => {
        const next = { ...prev };
        delete next[node.id];
        return next;
      });

      showSuccess(`Bucket "${node.name}" 删除成功!`);
    } else {
      showError(`删除 Bucket 失败: ${response_msg}`);
    }
  } catch (err) {
    showError(`删除 Bucket 时发生错误: ${getErrorMessage(err)}`);
  } finally {
    ctx.dialogs.closeDeleteDialog();
  }
};

const deleteS3FileNode = async (node: TreeNode, ctx: MutationContext) => {
  try {
    const responseJson = await deleteBucket({ level_infos: node.path });
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);

    if (response_code === 0) {
      ctx.setTreeData((prevTree) => removeNodeFromTree(prevTree, node.id));

      ctx.setOpenNodes((prev) => {
        const next = { ...prev };
        delete next[node.id];
        return next;
      });

      ctx.closeTabsUnderPath(node.path);

      showSuccess(`"${node.name}" 删除成功!`);
    } else {
      showError(`删除失败: ${response_msg}`);
    }
  } catch (err) {
    showError(`删除时发生错误: ${getErrorMessage(err)}`);
  } finally {
    ctx.dialogs.closeDeleteDialog();
  }
};

const deleteConnectionNode = async (node: TreeNode, ctx: MutationContext) => {
  const connectionIdToDelete = node.id;

  try {
    const responseJson = await deleteConnection(Number(connectionIdToDelete));
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);

    if (response_code === 0) {
      ctx.setOpenNodes((prevOpenNodes) => {
        const newOpenNodes = { ...prevOpenNodes };
        delete newOpenNodes[connectionIdToDelete];
        return newOpenNodes;
      });

      ctx.setTabs((prevTabs) => {
        const remainingTabs = prevTabs.filter(
          (tab) =>
            tab.type !== "sqlEditor" ||
            tab.connectionId !== connectionIdToDelete,
        );

        if (
          ctx.activeTabId &&
          !remainingTabs.some((tab) => tab.id === ctx.activeTabId)
        ) {
          ctx.setActiveTabId(
            remainingTabs.length > 0 ? remainingTabs[0].id : null,
          );
        }
        return remainingTabs;
      });

      if (ctx.onConnectionDeleted) {
        await ctx.onConnectionDeleted();
      }
    } else {
      console.error(
        "Failed to delete connection via delete_base_config:",
        response_msg,
      );
      showError(`删除连接失败: ${response_msg}`);
    }
  } catch (err) {
    console.error("Error invoking delete_base_config:", err);
    showError(`删除连接时发生错误: ${getErrorMessage(err)}`);
  } finally {
    ctx.dialogs.closeDeleteDialog();
  }
};

const renameNode = async (
  node: TreeNode,
  newName: string,
  ctx: MutationContext,
) => {
  if (
    !newName ||
    newName.includes("/") ||
    newName === "." ||
    newName === ".."
  ) {
    showError("名称不能为空，且不能包含 / 等特殊字符");
    return;
  }
  if (newName === node.name) {
    ctx.dialogs.closeRenameDialog();
    return;
  }

  const isFolder = node.iconName === "folder";
  try {
    const responseJson = await renameObject({
      listNodeInfoReq: { level_infos: node.path },
      newName,
      isFolder,
    });
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);
    if (response_code === 0) {
      showSuccess(`重命名成功: "${node.name}" -> "${newName}"`);

      ctx.closeTabsUnderPath(node.path);

      // 路径已变，清理该子树的展开状态并刷新父节点以重建子节点
      const subtreeIds = collectSubtreeIds(node);
      ctx.setOpenNodes((prev) => {
        const next = { ...prev };
        subtreeIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });

      const parent = findParentNode(ctx.treeData, node.id);
      if (parent) {
        await ctx.handleRefreshNode(parent);
      }
    } else {
      showError(`重命名失败: ${response_msg}`);
    }
  } catch (err) {
    showError(`重命名时发生错误: ${getErrorMessage(err)}`);
  } finally {
    ctx.dialogs.closeRenameDialog();
  }
};

const copyNode = async (
  node: TreeNode,
  targetDir: string,
  ctx: MutationContext,
) => {
  if (!targetDir) {
    showError("请输入目标目录路径");
    return;
  }
  const parentSegments = node.path.slice(1, -1).map((p) => p.config_value);
  const targetSegments = targetDir
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (targetSegments.join("/") === parentSegments.join("/")) {
    showError("目标目录不能与当前目录相同");
    return;
  }

  const isFolder = node.iconName === "folder";
  try {
    const responseJson = await copyObject({
      listNodeInfoReq: { level_infos: node.path },
      targetDir,
      isFolder,
    });
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);
    if (response_code === 0) {
      showSuccess(`已复制 "${node.name}" 到 ${targetDir}`);
    } else {
      showError(`复制失败: ${response_msg}`);
    }
  } catch (err) {
    showError(`复制时发生错误: ${getErrorMessage(err)}`);
  } finally {
    ctx.dialogs.closeCopyDialog();
  }
};

const editNode = async (node: TreeNode, ctx: MutationContext) => {
  if (node.iconName === "folder" || node.iconName === "textFile") {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const isFolder = node.iconName === "folder";
      const selected = await save({
        title: isFolder ? "选择保存位置" : "保存文件",
      });
      if (!selected) return;

      const responseJson = await downloadNodeFile(
        { level_infos: node.path },
        selected,
        isFolder,
      );
      const { response_code, response_msg } =
        parseBaseResponse<unknown>(responseJson);
      if (response_code === 0) {
        showSuccess("下载成功!");
      } else {
        showError(`下载失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`下载失败: ${getErrorMessage(err)}`);
    }
    return;
  }

  if (node.iconName !== "singleTable") return;

  const rootConfigId = node.path[0]?.config_value;
  const connection = findConnectionByRootConfigId(
    ctx.connections,
    rootConfigId,
  );
  if (!connection) {
    console.error("Connection details not found for node:", node);
    showError("无法找到数据库连接信息来编辑表详情。");
    return;
  }

  const tabId = `${node.id}-details`;
  const existingTab = ctx.tabs.find((tab) => tab.id === tabId);

  if (existingTab) {
    ctx.setActiveTabId(tabId);
  } else {
    const newTab: Tab = {
      id: tabId,
      name: `${node.name} [Details]`,
      icon: node.icon,
      type: "tableDetail",
      node: node,
      connectionId: connection.base_config_id,
    };
    ctx.setTabs([...ctx.tabs, newTab]);
    ctx.setActiveTabId(newTab.id);
  }
};

const createCollectionDialog = async (ctx: MutationContext) => {
  const node = ctx.dialogs.createCollectionNode;
  const name = ctx.dialogs.newCollectionName.trim();
  if (!name || !node) return;

  try {
    const responseJson = await createCollection(
      { level_infos: node.path },
      name,
    );
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);
    ctx.dialogs.hideCreateCollectionDialog();
    if (response_code === 0) {
      showSuccess(`Collection "${name}" 创建成功!`);
      await ctx.handleRefreshNode(node);
    } else {
      showError(`创建 Collection 失败: ${response_msg}`);
    }
  } catch (err) {
    ctx.dialogs.hideCreateCollectionDialog();
    showError(`创建 Collection 时发生错误: ${getErrorMessage(err)}`);
  }
};

const createBucketDialog = async (ctx: MutationContext) => {
  const node = ctx.dialogs.createBucketNode;
  const name = ctx.dialogs.newBucketName.trim();
  if (!name || !node) return;

  try {
    const responseJson = await createBucket({ level_infos: node.path }, name);
    const { response_code, response_msg } =
      parseBaseResponse<unknown>(responseJson);
    ctx.dialogs.hideCreateBucketDialog();
    if (response_code === 0) {
      showSuccess(`Bucket "${name}" 创建成功!`);
      await ctx.handleRefreshNode(node);
    } else {
      showError(`创建 Bucket 失败: ${response_msg}`);
    }
  } catch (err) {
    ctx.dialogs.hideCreateBucketDialog();
    showError(`创建 Bucket 时发生错误: ${getErrorMessage(err)}`);
  }
};

/**
 * 节点写操作：刷新、新增、删除、重命名、复制、下载与新建 Collection/Bucket。
 * 具体实现放在模块级函数中，hook 只负责注入当前的 state/refs。
 */
export function useNodeMutations(params: NodeMutationParams): NodeMutations {
  const handleRefreshNode = (node: TreeNode) =>
    refreshNode(node, { ...params, handleRefreshNode });

  const handleAddNode = (node: TreeNode) =>
    addNode(node, { ...params, handleRefreshNode });

  const handleConfirmDelete = async () => {
    const node = params.dialogs.nodeToDelete;
    if (!node) return;

    const ctx: MutationContext = { ...params, handleRefreshNode };
    if (node.iconName === "singleQuery") {
      await deleteQueryNode(node, ctx);
    } else if (node.iconName === "bucket") {
      await deleteBucketNode(node, ctx);
    } else if (node.iconName === "folder" || node.iconName === "textFile") {
      await deleteS3FileNode(node, ctx);
    } else {
      await deleteConnectionNode(node, ctx);
    }
  };

  const handleConfirmRename = async () => {
    const node = params.dialogs.nodeToRename;
    if (!node) return;
    await renameNode(node, params.dialogs.renameValue.trim(), {
      ...params,
      handleRefreshNode,
    });
  };

  const handleConfirmCopy = async () => {
    const node = params.dialogs.nodeToCopy;
    if (!node) return;
    await copyNode(node, params.dialogs.copyTargetDir.trim(), {
      ...params,
      handleRefreshNode,
    });
  };

  const handleEditNode = (node: TreeNode) =>
    editNode(node, { ...params, handleRefreshNode });

  const handleDeleteQuery = (node: TreeNode) => {
    params.dialogs.openDeleteDialog(node);
  };

  const handleConfirmCreateCollection = () =>
    createCollectionDialog({ ...params, handleRefreshNode });

  const handleConfirmCreateBucket = () =>
    createBucketDialog({ ...params, handleRefreshNode });

  // TreeRow 的动作 key -> 现有 handler
  const handleTreeRowAction = (node: TreeNode, actionKey: RowActionKey) => {
    switch (actionKey) {
      case "refresh":
        return handleRefreshNode(node);
      case "add":
        return handleAddNode(node);
      case "edit":
      case "download":
        // 下载沿用编辑通道（S3/WebDAV 文件与文件夹）
        return handleEditNode(node);
      case "deleteQuery":
        return handleDeleteQuery(node);
      default:
        return params.dialogs.openDeleteDialog(node);
    }
  };

  return {
    handleRefreshNode,
    handleAddNode,
    handleConfirmDelete,
    handleConfirmRename,
    handleConfirmCopy,
    handleEditNode,
    handleDeleteQuery,
    handleConfirmCreateCollection,
    handleConfirmCreateBucket,
    handleTreeRowAction,
  };
}
