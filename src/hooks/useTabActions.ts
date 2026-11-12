import type { Dispatch, ReactNode, SetStateAction } from "react";
import { saveQuery } from "../api/queries";
import { activateNode } from "../components/database-viewer/activation/activateNode";
import { isPathPrefix } from "../components/database-viewer/path";
import {
  findParentNode,
  removeNodeFromTree,
} from "../components/tree/treeModel";
import type { ConnectionSummary } from "../types/backend";
import type { SetActiveTabId, SetTabs, Tab } from "../types/tab";
import type { OpenNodes, TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError } from "../utils/showToast";

interface UseTabActionsParams {
  connections: ConnectionSummary[];
  tabs: Tab[];
  setTabs: SetTabs;
  activeTabId: string | null;
  setActiveTabId: SetActiveTabId;
  treeData: TreeNode[];
  setTreeData: Dispatch<SetStateAction<TreeNode[]>>;
  setOpenNodes: Dispatch<SetStateAction<OpenNodes>>;
  handleToggleNode: (node: TreeNode) => Promise<void>;
}

export interface TabActions {
  openSqlEditorTabWithContent: (
    connectionId: number,
    nodeIcon: ReactNode,
    generatedSql?: string,
    defaultName?: string,
    databaseName?: string,
  ) => Promise<boolean>;
  handleNodeActivate: (node: TreeNode) => Promise<void>;
  updateQueryNodeNameInTree: (queryIdToUpdate: string, newName: string) => void;
  closeTabsUnderPath: (prefix: TreeNode["path"]) => void;
  handleRedisKeyDeleted: (node: TreeNode) => void;
  handleKafkaTopicDeleted: (
    node: TreeNode,
    refreshNode: (node: TreeNode) => Promise<void>,
  ) => void;
}

/**
 * tab 级动作：新建 SQL 编辑器、节点激活编排、关闭失效 tab。
 * `handleKafkaTopicDeleted` 的父节点刷新由 useNodeMutations 注入，避免 hook 循环依赖。
 */
export function useTabActions({
  connections,
  tabs,
  setTabs,
  activeTabId,
  setActiveTabId,
  treeData,
  setTreeData,
  setOpenNodes,
  handleToggleNode,
}: UseTabActionsParams): TabActions {
  const openSqlEditorTabWithContent = async (
    connectionId: number,
    nodeIcon: ReactNode,
    generatedSql = "",
    defaultName = "",
    databaseName = "",
  ) => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    const timestamp = `${month}${day}${hours}${minutes}${seconds}`;
    const finalQueryName = defaultName || `Query_${timestamp}`;

    try {
      const responseJson = await saveQuery({
        connectionId,
        queryName: finalQueryName,
        sql: generatedSql,
        databaseName,
      });
      const { response_code, response_msg } =
        parseBaseResponse<string>(responseJson);

      if (response_code === 0) {
        const query_id = response_msg;
        const newTabId = `sql-editor-${query_id || Date.now()}`;

        const existingSqlEditorTab = tabs.find(
          (tab) => tab.type === "sqlEditor" && tab.queryId === query_id,
        );

        if (existingSqlEditorTab && existingSqlEditorTab.type === "sqlEditor") {
          setActiveTabId(existingSqlEditorTab.id);
          if (
            generatedSql &&
            existingSqlEditorTab.initialSql !== generatedSql
          ) {
            setTabs((prevTabs) =>
              prevTabs.map((t) =>
                t.id === existingSqlEditorTab.id
                  ? { ...t, initialSql: generatedSql, isDirty: true }
                  : t,
              ),
            );
          }
        } else {
          const newTab: Tab = {
            id: newTabId,
            name: finalQueryName,
            icon: nodeIcon,
            type: "sqlEditor",
            connectionId: connectionId,
            queryId: query_id,
            databaseName: databaseName,
            initialSql: generatedSql,
            isDirty: !!generatedSql,
          };
          setTabs((prevTabs) => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        }
        return true;
      } else {
        console.error(
          "Failed to create new query via save_query:",
          response_msg,
        );
        showError(`创建新查询失败: ${response_msg}`);
        return false;
      }
    } catch (err) {
      console.error("Error invoking save_query for new query:", err);
      showError(`创建新查询时发生错误: ${getErrorMessage(err)}`);
      return false;
    }
  };

  const handleNodeActivate = async (node: TreeNode) => {
    await activateNode(node, {
      connections,
      tabs,
      setTabs,
      setActiveTabId,
      openSqlEditorTabWithContent,
      handleToggleNode,
    });
  };

  const updateQueryNodeNameInTree = (
    queryIdToUpdate: string,
    newName: string,
  ) => {
    setTreeData((prevTree) => {
      const findAndUpdate = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (
            node.iconName === "singleQuery" &&
            node.path &&
            node.path.length > 0 &&
            node.path[node.path.length - 1].config_value.toString() ===
              queryIdToUpdate.toString()
          ) {
            return { ...node, name: newName };
          }
          if (node.children) {
            const updatedChildren = findAndUpdate(node.children);
            if (updatedChildren !== node.children) {
              return { ...node, children: updatedChildren };
            }
          }
          return node;
        });
      };
      return findAndUpdate(prevTree);
    });
  };

  // 关闭节点路径位于给定前缀之下的标签页（删除/重命名后旧引用已失效）
  const closeTabsUnderPath = (prefix: TreeNode["path"]) => {
    setTabs((prevTabs) => {
      const remaining = prevTabs.filter(
        (tab) =>
          !(
            tab.type === "s3Object" &&
            tab.node?.path &&
            isPathPrefix(prefix, tab.node.path)
          ),
      );
      if (activeTabId && !remaining.some((tab) => tab.id === activeTabId)) {
        setActiveTabId(
          remaining.length > 0 ? remaining[remaining.length - 1].id : null,
        );
      }
      return remaining;
    });
  };

  // Remove a Redis key node from the tree and close its tab
  const handleRedisKeyDeleted = (node: TreeNode) => {
    const tabId = `redis-key-${node.id}`;

    // Remove node from tree
    setTreeData((prevTree) => removeNodeFromTree(prevTree, node.id));

    // Remove the openNodes entry
    setOpenNodes((prev) => {
      const next = { ...prev };
      delete next[node.id];
      return next;
    });

    // Close the tab and switch to the previous one
    setTabs((prevTabs) => {
      const remaining = prevTabs.filter((tab) => tab.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(
          remaining.length > 0 ? remaining[remaining.length - 1].id : null,
        );
      }
      return remaining;
    });
  };

  // Kafka Topic 删除后：关闭该 Topic 下的标签页并刷新父节点（替代整页 reload）
  const handleKafkaTopicDeleted = (
    node: TreeNode,
    refreshNode: (node: TreeNode) => Promise<void>,
  ) => {
    setTabs((prevTabs) => {
      const remaining = prevTabs.filter((tab) => {
        const tabNode = "node" in tab ? tab.node : undefined;
        if (!tabNode?.path) return true;
        return !isPathPrefix(node.path, tabNode.path);
      });
      if (activeTabId && !remaining.some((tab) => tab.id === activeTabId)) {
        setActiveTabId(
          remaining.length > 0 ? remaining[remaining.length - 1].id : null,
        );
      }
      return remaining;
    });

    const parent = findParentNode(treeData, node.id);
    if (parent) {
      void refreshNode(parent);
    }
  };

  return {
    openSqlEditorTabWithContent,
    handleNodeActivate,
    updateQueryNodeNameInTree,
    closeTabsUnderPath,
    handleRedisKeyDeleted,
    handleKafkaTopicDeleted,
  };
}
