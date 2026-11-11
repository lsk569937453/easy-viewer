import { invoke } from "@tauri-apps/api/core";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaDatabase, FaPlus } from "react-icons/fa";
import type { ConnectionSummary, ListNodeInfoResponse } from "../types/backend";
import type { Tab } from "../types/tab";
import type {
  OpenNodes,
  RowActionKey,
  TreeNode,
  TreeNodeId,
} from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import {
  generateCreateColumnSql,
  generateCreateIndexSql,
  generateCreateTableSql,
} from "../utils/SqlUtils";
import { showError, showSuccess } from "../utils/showToast";
import NewConnectionModal from "./NewConnectionModal";
import TabPanel from "./TabPanel";
import { getNodeIcon } from "./tree/nodeIcons";
import TreeSidebar from "./tree/TreeSidebar";
import {
  collectSubtreeIds,
  findParentNode,
  isRootNode,
  mapChildList,
  pruneOpenNodes,
  syncRootsWithConnections,
  updateNodeInTree,
} from "./tree/treeModel";
import {
  loadPersistedOpenNodes,
  savePersistedOpenNodes,
  TREE_STATE_SAVE_DEBOUNCE_MS,
} from "./tree/treePersistence";
import ActionButton from "./ui/ActionButton";
import Panel from "./ui/Panel";
import StatusChip from "./ui/StatusChip";
import { EmptyState } from "./ui/states";

const findConnectionByRootConfigId = (
  connections: ConnectionSummary[],
  rootConfigId: string | undefined,
): ConnectionSummary | undefined => {
  return connections.find(
    (conn) => conn.base_config_id.toString() === rootConfigId,
  );
};

// path 以 prefix 为前缀（按 config_value 序列比较）
const isPathPrefix = (prefix: TreeNode["path"], path: TreeNode["path"]) =>
  prefix.length <= path.length &&
  prefix.every((seg, i) => seg.config_value === path[i]?.config_value);

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
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [openNodes, setOpenNodes] = useState<OpenNodes>(() =>
    loadPersistedOpenNodes(),
  );
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<number | null>(
    null,
  );
  const createCollectionModalRef = useRef<HTMLDialogElement>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [createCollectionNode, setCreateCollectionNode] =
    useState<TreeNode | null>(null);

  const createBucketModalRef = useRef<HTMLDialogElement>(null);
  const [newBucketName, setNewBucketName] = useState("");
  const [createBucketNode, setCreateBucketNode] = useState<TreeNode | null>(
    null,
  );

  const renameModalRef = useRef<HTMLDialogElement>(null);
  const [nodeToRename, setNodeToRename] = useState<TreeNode | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const copyModalRef = useRef<HTMLDialogElement>(null);
  const [nodeToCopy, setNodeToCopy] = useState<TreeNode | null>(null);
  const [copyTargetDir, setCopyTargetDir] = useState("");

  const [nodeToDelete, setNodeToDelete] = useState<TreeNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const openNodesRef = useRef<OpenNodes>(openNodes);
  useEffect(() => {
    openNodesRef.current = openNodes;
  }, [openNodes]);

  // 展开状态持久化：防抖后整表覆盖写入 localStorage
  useEffect(() => {
    const timer = setTimeout(
      () => savePersistedOpenNodes(openNodes),
      TREE_STATE_SAVE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [openNodes]);

  // 树数据的最新快照：connections 同步时需要读取"当前"树，而 effect 闭包里的
  // treeData 可能是上一轮渲染的值
  const treeDataRef = useRef<TreeNode[]>(treeData);
  useEffect(() => {
    treeDataRef.current = treeData;
  }, [treeData]);

  // nodeId -> 递增序号：并发加载时只有最后一次发起的请求可以写回树（P0-4）
  const loadSeqRef = useRef<Map<string, number>>(new Map());
  const nextLoadSeq = useCallback((nodeId: TreeNodeId) => {
    const key = String(nodeId);
    const seq = (loadSeqRef.current.get(key) ?? 0) + 1;
    loadSeqRef.current.set(key, seq);
    return seq;
  }, []);
  const isLatestLoad = useCallback(
    (nodeId: TreeNodeId, seq: number) =>
      loadSeqRef.current.get(String(nodeId)) === seq,
    [],
  );

  useEffect(() => {
    const loadSeqMap = loadSeqRef.current;
    return () => loadSeqMap.clear();
  }, []);

  const fetchNodeChildren = useCallback(
    async (parentNode: TreeNode) => {
      const seq = nextLoadSeq(parentNode.id);

      setTreeData((prevTree) =>
        updateNodeInTree(prevTree, parentNode.id, {
          isLoading: true,
          error: null,
        }),
      );

      try {
        const listNodeInfoReq = { level_infos: parentNode.path };
        const responseJson = await invoke<string>("list_node_info", {
          listNodeInfoReq,
        });
        const { response_code, response_msg } =
          parseBaseResponse<ListNodeInfoResponse>(responseJson);
        if (response_code !== 0) {
          throw new Error(response_msg || "加载失败");
        }

        // 先构建 childNodes 再写 state：调用方需要立即拿到返回值（不依赖 React 批处理时机）
        const childNodes = mapChildList(
          parentNode,
          response_msg.list,
          getNodeIcon,
        );

        if (isLatestLoad(parentNode.id, seq)) {
          setTreeData((prevTree) =>
            updateNodeInTree(prevTree, parentNode.id, {
              children: childNodes,
              isLoading: false,
              error: null,
            }),
          );
        }

        return childNodes;
      } catch (error) {
        console.error("Failed to fetch node children:", error);
        if (isLatestLoad(parentNode.id, seq)) {
          setTreeData((prevTree) =>
            updateNodeInTree(prevTree, parentNode.id, {
              // 保持 null，便于重试/再次展开重新触发拉取
              children: null,
              isLoading: false,
              error: getErrorMessage(error),
            }),
          );
        }
        return null;
      }
    },
    [isLatestLoad, nextLoadSeq],
  );

  const updateQueryNodeNameInTree = useCallback(
    (queryIdToUpdate: string, newName: string) => {
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
    },
    [],
  );

  // connections -> 根节点描述（不含 children 等运行时状态）
  const toRootDescriptor = useCallback((conn: ConnectionSummary) => {
    const dbTypeMap: Record<number, string> = {
      0: "mysql",
      1: "postgresql",
      2: "kafka",
      3: "sqlite",
      4: "mongodb",
      5: "oracle",
      6: "mssql",
      7: "clickhouse",
      8: "s3",
      9: "redis",
      10: "elasticsearch",
      11: "rocketmq",
      12: "webdav",
    };
    const dbType = dbTypeMap[conn.connection_type] || "default";

    return {
      id: conn.base_config_id,
      name: conn.connection_name,
      type: dbType,
      icon: getNodeIcon(dbType, null),
      iconName: dbType,
      description: conn.description,
      host: conn.host ?? null,
      port: conn.port ?? null,
      details: `ID: ${
        conn.base_config_id
      }\n类型: ${dbType.toUpperCase()}\n主机: ${conn.host || "N/A"}:${
        conn.port || "N/A"
      }`,
      path: [{ level: 1, config_value: conn.base_config_id.toString() }],
    };
  }, []);

  // 正在探测版本的根节点：避免 StrictMode 双执行时重复探测
  const versionProbeRef = useRef<Set<string>>(new Set());

  const probeServerVersions = useCallback(async (rootIds: TreeNodeId[]) => {
    const targets = rootIds.filter(
      (id) => !versionProbeRef.current.has(String(id)),
    );
    if (targets.length === 0) return;

    targets.forEach((id) => {
      versionProbeRef.current.add(String(id));
    });
    setIsRefreshing(true);

    try {
      const results = await Promise.allSettled(
        targets.map(async (id) => {
          try {
            const res = await invoke<string>("get_server_version", {
              baseConfigId: id,
            });
            const { response_code, response_msg } =
              parseBaseResponse<string>(res);
            if (response_code === 0) {
              return {
                id,
                update: { version: response_msg || null, offline: false },
              };
            }
            return { id, update: { offline: true } };
          } catch {
            return { id, update: { offline: true } };
          }
        }),
      );

      setTreeData((prev) => {
        let updated = prev;
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            updated = updateNodeInTree(updated, r.value.id, r.value.update);
          }
        }
        return updated;
      });
    } finally {
      targets.forEach((id) => {
        versionProbeRef.current.delete(String(id));
      });
      setIsRefreshing(false);
    }
  }, []);

  // 恢复已展开但尚未加载 children 的分支（初始挂载 / 连接信息重置两类场景）
  const hydrateOpenBranch = useCallback(
    async (node: TreeNode, visited: Set<string>) => {
      const key = String(node.id);
      if (visited.has(key)) return;
      visited.add(key);

      if (!openNodesRef.current[node.id]) return;

      let current = node;
      if (current.children === null) {
        const children = await fetchNodeChildren(current);
        if (!children) return;
        current = { ...current, children };
      }
      if (!Array.isArray(current.children) || current.children.length === 0) {
        return;
      }

      for (const child of current.children) {
        await hydrateOpenBranch(child, visited);
      }
    },
    [fetchNodeChildren],
  );

  // connections 变化时按 id 合并根节点：不再全量重建，已加载子树与展开态得以保留
  useEffect(() => {
    let cancelled = false;

    const syncTree = async () => {
      const { roots, addedIds, removedIds, resetIds } =
        syncRootsWithConnections(
          treeDataRef.current,
          connections,
          toRootDescriptor,
        );

      setTreeData(roots);

      if (removedIds.length > 0) {
        setOpenNodes((prev) => pruneOpenNodes(prev, removedIds));
      }

      // 只有新增连接（含首次挂载）与端点变更的连接才探测版本，
      // 未变化的连接不再重复探测，也不再触发全屏"正在检测连接状态"遮罩
      const idsToProbe = [...addedIds, ...resetIds];
      if (idsToProbe.length > 0) {
        await probeServerVersions(idsToProbe);
      }
      if (cancelled) return;

      for (const root of roots) {
        if (cancelled) return;
        await hydrateOpenBranch(root, new Set());
      }
    };

    syncTree();

    return () => {
      cancelled = true;
    };
  }, [connections, hydrateOpenBranch, probeServerVersions, toRootDescriptor]);

  const generateSqlForNode = (
    node: TreeNode,
    allConnections: ConnectionSummary[],
    limit = 100,
  ) => {
    if (node?.iconName !== "singleTable") {
      return "此节点类型不适用于SQL生成。";
    }

    const rootConfigId = node.path[0].config_value;
    const connection = allConnections.find(
      (conn) => conn.base_config_id.toString() === rootConfigId,
    );

    if (!connection) {
      return `/* 错误: 无法找到连接信息来生成SQL */\nSELECT * FROM ${node.name} LIMIT ${limit};`;
    }

    const dbType = connection.connection_type;
    const tableName = node.name;

    switch (dbType) {
      case 0: {
        // MySQL
        const mysqlDatabaseName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM \`${mysqlDatabaseName}\`.\`${tableName}\` LIMIT ${limit};`;
      }
      case 5: {
        // OracleDB
        const oracleSchemaName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM "${oracleSchemaName}"."${tableName}" WHERE ROWNUM <= ${limit};`;
      }
      case 3:
        // SQLite
        return `SELECT * FROM \`${tableName}\` LIMIT ${limit};`;
      case 1: {
        // PostgreSQL
        const pgSchemaName =
          node.path.length > 2 ? node.path[1].config_value : "public";
        return `SELECT * FROM "${pgSchemaName}"."${tableName}" LIMIT ${limit};`;
      }
      case 6: {
        // MSSQL
        const mssqlDatabaseName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        const mssqlSchemaName =
          node.path.length > 4 ? node.path[3].config_value : "dbo";
        return `SELECT TOP ${limit} * FROM [${mssqlDatabaseName}].[${mssqlSchemaName}].[${tableName}];`;
      }
      case 7:
        // Clickhouse
        return `SELECT * FROM ${tableName} LIMIT ${limit};`;
      case 4:
        // MongoDB
        return `SELECT * FROM ${tableName} LIMIT ${limit}`;
      case 9:
        // Redis
        return `SELECT * FROM ${tableName} LIMIT ${limit}`;
      case 10:
        // Elasticsearch
        return `SELECT * FROM ${tableName} LIMIT ${limit}`;
      default:
        return `SELECT * FROM ${tableName} LIMIT ${limit};`;
    }
  };

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
      const responseJson = await invoke<string>("save_query", {
        connectionId: connectionId,
        queryName: finalQueryName,
        sql: generatedSql,
        databaseName: databaseName || undefined,
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
    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      console.error("Connection details not found for node:", node);
      showError("无法找到数据库连接信息。");
      return;
    }

    if (node.iconName === "singleQuery") {
      const queryId = node.path[node.path.length - 1].config_value;
      const databaseName = node.path[1]?.config_value || "";
      const newTabId = `sql-editor-${queryId}`;

      const existingSqlEditorTab = tabs.find(
        (tab) => tab.type === "sqlEditor" && tab.queryId === queryId,
      );
      if (existingSqlEditorTab) {
        setActiveTabId(existingSqlEditorTab.id);
      } else {
        const newTab: Tab = {
          id: newTabId,
          name: node.name,
          icon: node.icon,
          type: "sqlEditor",
          connectionId: connection.base_config_id,
          queryId: queryId,
          databaseName: databaseName,
          initialSql: null,
          isDirty: false,
          // 该分支的 tab 没有 node 对象，用 sourceNodeId 支撑树的选中高亮
          sourceNodeId: node.id,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    } else if (node.iconName === "folder" || node.iconName === "textFile") {
      const tabId = `s3-object-${node.id}`;
      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: node.name,
          icon: node.icon,
          type: "s3Object",
          node: node,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      await handleToggleNode(node);
      return;
    } else if (node.iconName === "singleTable") {
      const rootConfigId = node.path[0]?.config_value;
      const connection = findConnectionByRootConfigId(
        connections,
        rootConfigId,
      );

      // Redis key — use dedicated RedisKeyDetailPanel
      if (connection && connection.connection_type === 9) {
        const keyName = node.name;
        const tabId = `redis-key-${node.id}`;
        const existingTab = tabs.find((tab) => tab.id === tabId);
        if (existingTab) {
          setActiveTabId(existingTab.id);
        } else {
          const newTab: Tab = {
            id: tabId,
            name: keyName,
            icon: node.icon,
            type: "redisKeyDetail",
            node: node,
            connectionDetails: connection,
          };
          setTabs((prevTabs) => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        }
        await handleToggleNode(node);
        return;
      }

      // Elasticsearch index — use dedicated ElasticsearchIndexPanel
      if (connection && connection.connection_type === 10) {
        const tabId = `es-index-${node.id}`;
        const existingTab = tabs.find((tab) => tab.id === tabId);
        if (existingTab) {
          setActiveTabId(existingTab.id);
        } else {
          const newTab: Tab = {
            id: tabId,
            name: node.name,
            icon: node.icon,
            type: "esIndexBrowser",
            node: node,
            connectionDetails: connection,
          };
          setTabs((prevTabs) => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        }
        await handleToggleNode(node);
        return;
      }

      if (!connection) {
        console.error("Connection details not found for node:", node);
        showError("无法找到数据库连接信息。");
        return;
      }

      const tableId = node.path[node.path.length - 1].config_value;
      const newTabId = `singleTable-${tableId}`;
      const existingSqlEditorTab = tabs.find(
        (tab) => tab.type === "singleTable" && tab.id === newTabId,
      );
      if (existingSqlEditorTab) {
        setActiveTabId(existingSqlEditorTab.id);
      } else {
        const sql = generateSqlForNode(node, connections);

        const newTab: Tab = {
          id: newTabId,
          name: node.name,
          icon: node.icon,
          details: sql,
          iconName: node.iconName,
          path: node.path,
          type: "singleTable",
          initialSql: sql,
          node: node,
          connectionDetails: connection,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      // 表节点同时切换展开/折叠
      await handleToggleNode(node);
      return;
    } else if (
      node.iconName === "singlePrimaryIndex" ||
      node.iconName === "singleCommonIndex"
    ) {
      // 处理索引节点点击
      // 索引节点的 path 结构: [connection, database, type, table, "Index", index_name]
      // 表名在 path[3] 的位置
      const tableName = node.path[3]?.config_value;
      const indexName = node.name;
      const newTabId = `index-${node.id}`;

      const existingIndexTab = tabs.find((tab) => tab.id === newTabId);
      if (existingIndexTab) {
        setActiveTabId(existingIndexTab.id);
      } else {
        const newTab: Tab = {
          id: newTabId,
          name: indexName,
          icon: node.icon,
          details: `索引: ${indexName}`,
          type: "indexDetail",
          node: node,
          tableName: tableName,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    } else if (node.iconName === "column" || node.iconName === "primary") {
      const columnName = node.name;
      const tableName = node.path[node.path.length - 3]?.config_value;
      const newTabId = `column-${node.id}`;

      const existingColumnTab = tabs.find((tab) => tab.id === newTabId);
      if (existingColumnTab) {
        setActiveTabId(existingColumnTab.id);
      } else {
        const newTab: Tab = {
          id: newTabId,
          name: columnName,
          icon: node.icon,
          details: `列: ${columnName}`,
          type: "columnDetail",
          node: node,
          tableName: tableName,
          iconName: node.iconName,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    } else if (node.iconName === "columns") {
      // 点击 Columns 文件夹 -> 打开所属表的列信息详情页
      const tableName = node.path[node.path.length - 2]?.config_value;
      const tabId = `columns-detail-${node.id}`;
      const existingTab = tabs.find((tab) => tab.id === tabId);

      if (existingTab) {
        setActiveTabId(tabId);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `${tableName} - 列信息`,
          icon: node.icon,
          type: "tableDetail",
          node: node,
          defaultTab: "column",
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      await handleToggleNode(node);
      return;
    }

    // Kafka 节点处理
    if (node.iconName?.startsWith("kafka_")) {
      await handleKafkaNodeActivate(node, connection);
      return;
    }

    // RocketMQ 节点处理
    if (node.iconName?.startsWith("rocketmq_")) {
      await handleRocketmqNodeActivate(node, connection);
      return;
    }

    // Redis 节点处理
    if (node.iconName?.startsWith("redis_")) {
      await handleRedisNodeActivate(node, connection);
      return;
    }

    // 纯文件夹节点（tables, views, columns, index, partitions 等）只展开/折叠，不创建 tab
    await handleToggleNode(node);
  };

  // Kafka 节点激活处理
  const handleKafkaNodeActivate = async (
    node: TreeNode,
    connection: ConnectionSummary,
  ) => {
    const nodeType = node.iconName;

    // Topic 消息查看
    if (nodeType === "kafka_messages" || nodeType === "kafka_single_topic") {
      const topicName =
        node.path[node.path.length - 1]?.config_value || node.name;
      const tabId = `kafka-messages-${node.id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `${topicName} - Messages`,
          icon: node.icon,
          type: "kafkaMessages",
          node: node,
          connectionDetails: connection,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      if (nodeType === "kafka_messages") {
        await handleToggleNode(node);
      }
      return;
    }

    // Topic 详情页
    if (nodeType === "kafka_partitions" || nodeType === "kafka_config") {
      const topicName = node.path[node.path.length - 2]?.config_value;
      const tabId = `kafka-topic-${node.id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `${topicName} - Details`,
          icon: node.icon,
          type: "kafkaTopicDetail",
          node: node,
          connectionDetails: connection,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      await handleToggleNode(node);
      return;
    }

    // 默认展开/折叠
    await handleToggleNode(node);
  };

  // RocketMQ 节点激活处理
  const handleRocketmqNodeActivate = async (
    node: TreeNode,
    connection: ConnectionSummary,
  ) => {
    const nodeType = node.iconName;

    // Topic 消息查看
    if (
      nodeType === "rocketmq_messages" ||
      nodeType === "rocketmq_single_topic"
    ) {
      const topicName =
        node.path[node.path.length - 1]?.config_value || node.name;
      const tabId = `rocketmq-messages-${node.id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `${topicName} - Messages`,
          icon: node.icon,
          type: "rocketmqMessages",
          node: node,
          connectionDetails: connection,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      if (nodeType === "rocketmq_messages") {
        await handleToggleNode(node);
      }
      return;
    }

    // 默认展开/折叠
    await handleToggleNode(node);
  };

  // Redis 节点激活处理
  const handleRedisNodeActivate = async (
    node: TreeNode,
    connection: ConnectionSummary,
  ) => {
    const nodeType = node.iconName;

    // Console 节点
    if (nodeType === "redis_console") {
      const tabId = `redis-console-${connection.base_config_id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `Redis Console`,
          icon: node.icon,
          type: "redisConsole",
          node: node,
          connectionDetails: connection,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    }

    // 默认展开/折叠
    await handleToggleNode(node);
  };

  const handleToggleNode = async (node: TreeNode) => {
    const isCurrentlyOpen = openNodes[node.id];

    setOpenNodes((prev) => ({ ...prev, [node.id]: !isCurrentlyOpen }));

    if (!isCurrentlyOpen && node.children === null) {
      await fetchNodeChildren(node);
    }
  };

  // 根节点刷新时顺带重探服务端版本 / 在线状态
  const refreshRootVersion = useCallback(async (rootNode: TreeNode) => {
    try {
      const res = await invoke<string>("get_server_version", {
        baseConfigId: rootNode.id,
      });
      const { response_code, response_msg } = parseBaseResponse<string>(res);
      const update =
        response_code === 0
          ? { version: response_msg || null, offline: false }
          : { offline: true };
      setTreeData((prev) => updateNodeInTree(prev, rootNode.id, update));
    } catch {
      setTreeData((prev) =>
        updateNodeInTree(prev, rootNode.id, { offline: true }),
      );
    }
  }, []);

  const handleRefreshNode = async (node: TreeNode) => {
    if (isRootNode(node)) {
      await refreshRootVersion(node);
    }

    const childNodes = await fetchNodeChildren(node);
    setOpenNodes((prev) => ({ ...prev, [node.id]: true }));

    // Re-fetch data for open children using raw invoke calls, then
    // update the tree in a SINGLE setTreeData to avoid React batching races.
    if (childNodes && childNodes.length > 0) {
      const currentOpenNodes = openNodesRef.current;
      const openChildren = childNodes.filter(
        (child) => currentOpenNodes[child.id],
      );

      if (openChildren.length > 0) {
        // 每个 child 独立取号：只有最后一次发起的加载可以写回
        const results = await Promise.all(
          openChildren.map(async (child) => {
            const seq = nextLoadSeq(child.id);
            try {
              const responseJson = await invoke<string>("list_node_info", {
                listNodeInfoReq: { level_infos: child.path },
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
        setTreeData((prevTree) => {
          let updated = prevTree;
          for (const result of results) {
            if (!isLatestLoad(result.child.id, result.seq)) continue;

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

  // Remove a Redis key node from the tree and close its tab
  const handleRedisKeyDeleted = (node: TreeNode) => {
    const tabId = `redis-key-${node.id}`;

    // Remove node from tree
    setTreeData((prevTree) => {
      const removeFromTree = (nodes: TreeNode[]): TreeNode[] =>
        nodes.flatMap((n): TreeNode[] => {
          if (n.id === node.id) return [];
          if (n.children) {
            const updated = removeFromTree(n.children);
            if (updated !== n.children) {
              return [{ ...n, children: updated }];
            }
          }
          return [n];
        });
      return removeFromTree(prevTree);
    });

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
  const handleKafkaTopicDeleted = (node: TreeNode) => {
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
      void handleRefreshNode(parent);
    }
  };

  const handleAddNode = async (node: TreeNode) => {
    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      showError("无法找到数据库连接信息来执行此操作。");
      return;
    }

    const connectionId = parseInt(rootConfigId, 10);
    const connectionType = connection.connection_type;
    const databaseName = node.path[1]?.config_value || "";
    let generatedSql = "";
    let defaultQueryName = "";

    if (node.iconName === "query") {
    } else if (node.iconName === "tables") {
      const tableName = node.name;
      generatedSql = generateCreateTableSql(connectionType, tableName);
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
      generatedSql = generateCreateColumnSql(connectionType, tableName);
      defaultQueryName = `Add_Column_to_${tableName}`;
    } else if (node.iconName === "index") {
      const tableName = node.path[node.path.length - 2]?.config_value;
      if (!tableName) {
        showError("无法确定表名来生成 CREATE INDEX SQL。");
        return;
      }
      generatedSql = generateCreateIndexSql(connectionType, tableName);
      defaultQueryName = `Add_Index_to_${tableName}`;
    } else if (node.iconName === "s3") {
      setNewBucketName("");
      setCreateBucketNode(node);
      createBucketModalRef.current?.showModal();
      return;
    } else if (node.iconName === "webdav") {
      // WebDAV 根目录:打开上传面板
      const tabId = `s3-upload-${node.id}`;
      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `上传到 ${node.name}`,
          icon: node.icon,
          type: "s3Upload",
          node: node,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    } else if (node.iconName === "bucket" || node.iconName === "folder") {
      // Bucket / 文件夹:打开上传面板
      const tabId = `s3-upload-${node.id}`;
      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
      } else {
        const newTab: Tab = {
          id: tabId,
          name: `上传到 ${node.name}`,
          icon: node.icon,
          type: "s3Upload",
          node: node,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
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
        const responseJson = await invoke<string>("kafka_create_topic", {
          connectionId: connectionId,
          topic: topicName,
          numPartitions: numPartitions,
          replicationFactor: replicationFactor,
        });
        const { response_code, response_msg } =
          parseBaseResponse<unknown>(responseJson);

        if (response_code === 0) {
          showSuccess(`Topic "${topicName}" 创建成功!`);
          await handleRefreshNode(node);
        } else {
          showError(`创建 Topic 失败: ${response_msg}`);
        }
      } catch (err) {
        showError(`创建 Topic 时发生错误: ${getErrorMessage(err)}`);
      }
      return;
    } else if (node.iconName === "collections") {
      setNewCollectionName("");
      setCreateCollectionNode(node);
      createCollectionModalRef.current?.showModal();
      return;
    } else {
      showError(
        `触发了"新增"操作，目标节点: ${node.name}，但此节点类型不支持生成SQL。`,
      );
      return;
    }

    const success = await openSqlEditorTabWithContent(
      connectionId,
      node.icon,
      generatedSql,
      defaultQueryName,
      databaseName,
    );

    if (node.iconName === "query" && success) {
      await handleRefreshNode(node);
    }
  };

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

  const handleRequestDeleteConnection = (node: TreeNode) => {
    setNodeToDelete(node);
    deleteModalRef.current?.showModal();
  };

  const handleConfirmDelete = async () => {
    if (!nodeToDelete) return;
    if (nodeToDelete.iconName === "singleQuery") {
      const baseConfigId = nodeToDelete.path[0]?.config_value;
      const queryName = nodeToDelete.name;
      const queryId =
        nodeToDelete.path[nodeToDelete.path.length - 1]?.config_value;

      if (!baseConfigId || !queryName || !queryId) {
        showError("无法获取完整的查询信息来删除。");
        setNodeToDelete(null);
        deleteModalRef.current?.close();
        return;
      }

      try {
        const databaseName = nodeToDelete.path[1]?.config_value || "";
        const responseJson = await invoke<string>("remove_query", {
          baseConfigId: parseInt(baseConfigId, 10),
          queryName: queryName,
          databaseName: databaseName || undefined,
        });
        const { response_code, response_msg } =
          parseBaseResponse<unknown>(responseJson);

        if (response_code === 0) {
          setTreeData((prevTree) => {
            const removeQueryNode = (nodes: TreeNode[]): TreeNode[] => {
              return nodes
                .map((node) => {
                  if (
                    node.iconName === "singleQuery" &&
                    node.path &&
                    node.path.length > 0 &&
                    node.path[node.path.length - 1].config_value.toString() ===
                      queryId.toString() &&
                    node.path[0].config_value.toString() ===
                      baseConfigId.toString()
                  ) {
                    return null;
                  }
                  if (node.children) {
                    const updatedChildren = removeQueryNode(node.children);
                    if (updatedChildren !== node.children) {
                      return { ...node, children: updatedChildren };
                    }
                  }
                  return node;
                })
                .filter((node): node is TreeNode => node !== null);
            };
            return removeQueryNode(prevTree);
          });

          setOpenNodes((prevOpenNodes) => {
            const newOpenNodes = { ...prevOpenNodes };
            delete newOpenNodes[nodeToDelete.id];
            return newOpenNodes;
          });

          setTabs((prevTabs) => {
            const remainingTabs = prevTabs.filter(
              (tab) =>
                !(
                  tab.type === "sqlEditor" &&
                  tab.queryId === parseInt(queryId, 10)
                ),
            );
            if (
              activeTabId &&
              !remainingTabs.some((tab) => tab.id === activeTabId)
            ) {
              setActiveTabId(
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
        setNodeToDelete(null);
        deleteModalRef.current?.close();
      }
    } else if (nodeToDelete.iconName === "bucket") {
      try {
        const responseJson = await invoke<string>("delete_bucket", {
          listNodeInfoReq: { level_infos: nodeToDelete.path },
        });
        const { response_code, response_msg } =
          parseBaseResponse<unknown>(responseJson);

        if (response_code === 0) {
          setTreeData((prevTree) => {
            const removeBucketNode = (nodes: TreeNode[]): TreeNode[] =>
              nodes.flatMap((n): TreeNode[] => {
                if (n.id === nodeToDelete.id) return [];
                if (n.children) {
                  const updated = removeBucketNode(n.children);
                  if (updated !== n.children) {
                    return [{ ...n, children: updated }];
                  }
                }
                return [n];
              });
            return removeBucketNode(prevTree);
          });

          setOpenNodes((prev) => {
            const next = { ...prev };
            delete next[nodeToDelete.id];
            return next;
          });

          showSuccess(`Bucket "${nodeToDelete.name}" 删除成功!`);
        } else {
          showError(`删除 Bucket 失败: ${response_msg}`);
        }
      } catch (err) {
        showError(`删除 Bucket 时发生错误: ${getErrorMessage(err)}`);
      } finally {
        setNodeToDelete(null);
        deleteModalRef.current?.close();
      }
    } else if (
      nodeToDelete.iconName === "folder" ||
      nodeToDelete.iconName === "textFile"
    ) {
      try {
        const responseJson = await invoke<string>("delete_bucket", {
          listNodeInfoReq: { level_infos: nodeToDelete.path },
        });
        const { response_code, response_msg } =
          parseBaseResponse<unknown>(responseJson);

        if (response_code === 0) {
          setTreeData((prevTree) => {
            const removeNode = (nodes: TreeNode[]): TreeNode[] =>
              nodes.flatMap((n): TreeNode[] => {
                if (n.id === nodeToDelete.id) return [];
                if (n.children) {
                  const updated = removeNode(n.children);
                  if (updated !== n.children) {
                    return [{ ...n, children: updated }];
                  }
                }
                return [n];
              });
            return removeNode(prevTree);
          });

          setOpenNodes((prev) => {
            const next = { ...prev };
            delete next[nodeToDelete.id];
            return next;
          });

          closeTabsUnderPath(nodeToDelete.path);

          showSuccess(`"${nodeToDelete.name}" 删除成功!`);
        } else {
          showError(`删除失败: ${response_msg}`);
        }
      } catch (err) {
        showError(`删除时发生错误: ${getErrorMessage(err)}`);
      } finally {
        setNodeToDelete(null);
        deleteModalRef.current?.close();
      }
    } else {
      const connectionIdToDelete = nodeToDelete.id;

      try {
        const responseJson = await invoke<string>("delete_base_config", {
          baseConfigId: connectionIdToDelete,
        });
        const { response_code, response_msg } =
          parseBaseResponse<unknown>(responseJson);

        if (response_code === 0) {
          setOpenNodes((prevOpenNodes) => {
            const newOpenNodes = { ...prevOpenNodes };
            delete newOpenNodes[connectionIdToDelete];
            return newOpenNodes;
          });

          setTabs((prevTabs) => {
            const remainingTabs = prevTabs.filter(
              (tab) =>
                tab.type !== "sqlEditor" ||
                tab.connectionId !== connectionIdToDelete,
            );

            if (
              activeTabId &&
              !remainingTabs.some((tab) => tab.id === activeTabId)
            ) {
              setActiveTabId(
                remainingTabs.length > 0 ? remainingTabs[0].id : null,
              );
            }
            return remainingTabs;
          });

          if (onConnectionDeleted) {
            await onConnectionDeleted();
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
        setNodeToDelete(null);
        deleteModalRef.current?.close();
      }
    }
  };

  const handleCancelDelete = () => {
    setNodeToDelete(null);
    deleteModalRef.current?.close();
  };

  // ---- WebDAV 节点右键菜单：复制 / 重命名 / 删除 ----
  const handleRequestRename = (node: TreeNode) => {
    setNodeToRename(node);
    setRenameValue(node.name);
    renameModalRef.current?.showModal();
  };

  const handleCancelRename = () => {
    setNodeToRename(null);
    renameModalRef.current?.close();
  };

  const handleConfirmRename = async () => {
    if (!nodeToRename) return;
    const newName = renameValue.trim();
    if (
      !newName ||
      newName.includes("/") ||
      newName === "." ||
      newName === ".."
    ) {
      showError("名称不能为空，且不能包含 / 等特殊字符");
      return;
    }
    if (newName === nodeToRename.name) {
      handleCancelRename();
      return;
    }

    const isFolder = nodeToRename.iconName === "folder";
    try {
      const responseJson = await invoke<string>("rename_object", {
        listNodeInfoReq: { level_infos: nodeToRename.path },
        newName,
        isFolder,
      });
      const { response_code, response_msg } =
        parseBaseResponse<unknown>(responseJson);
      if (response_code === 0) {
        showSuccess(`重命名成功: "${nodeToRename.name}" -> "${newName}"`);

        closeTabsUnderPath(nodeToRename.path);

        // 路径已变，清理该子树的展开状态并刷新父节点以重建子节点
        const subtreeIds = collectSubtreeIds(nodeToRename);
        setOpenNodes((prev) => {
          const next = { ...prev };
          subtreeIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });

        const parent = findParentNode(treeData, nodeToRename.id);
        if (parent) {
          await handleRefreshNode(parent);
        }
      } else {
        showError(`重命名失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`重命名时发生错误: ${getErrorMessage(err)}`);
    } finally {
      setNodeToRename(null);
      renameModalRef.current?.close();
    }
  };

  const handleRequestCopy = (node: TreeNode) => {
    setNodeToCopy(node);
    // 预填当前所在目录，便于在其基础上修改
    const parentSegments = node.path.slice(1, -1).map((p) => p.config_value);
    setCopyTargetDir(`/${parentSegments.join("/")}`);
    copyModalRef.current?.showModal();
  };

  const handleCancelCopy = () => {
    setNodeToCopy(null);
    copyModalRef.current?.close();
  };

  const handleConfirmCopy = async () => {
    if (!nodeToCopy) return;
    const targetDir = copyTargetDir.trim();
    if (!targetDir) {
      showError("请输入目标目录路径");
      return;
    }
    const parentSegments = nodeToCopy.path
      .slice(1, -1)
      .map((p) => p.config_value);
    const targetSegments = targetDir
      .split("/")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (targetSegments.join("/") === parentSegments.join("/")) {
      showError("目标目录不能与当前目录相同");
      return;
    }

    const isFolder = nodeToCopy.iconName === "folder";
    try {
      const responseJson = await invoke<string>("copy_object", {
        listNodeInfoReq: { level_infos: nodeToCopy.path },
        targetDir,
        isFolder,
      });
      const { response_code, response_msg } =
        parseBaseResponse<unknown>(responseJson);
      if (response_code === 0) {
        showSuccess(`已复制 "${nodeToCopy.name}" 到 ${targetDir}`);
      } else {
        showError(`复制失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`复制时发生错误: ${getErrorMessage(err)}`);
    } finally {
      setNodeToCopy(null);
      copyModalRef.current?.close();
    }
  };

  // 仅 WebDAV 连接下的文件/文件夹节点提供右键菜单
  const buildNodeContextMenuItems = (node: TreeNode) => {
    if (node.iconName !== "folder" && node.iconName !== "textFile") return null;
    const connection = findConnectionByRootConfigId(
      connections,
      node.path?.[0]?.config_value,
    );
    if (connection?.connection_type !== 12) return null;
    return [
      { label: "复制到其他目录...", onClick: () => handleRequestCopy(node) },
      { label: "重命名...", onClick: () => handleRequestRename(node) },
      { label: "删除", onClick: () => handleRequestDeleteConnection(node) },
    ];
  };

  const handleConfirmCreateCollection = async () => {
    if (!newCollectionName.trim() || !createCollectionNode) return;

    try {
      const listNodeInfoReq = { level_infos: createCollectionNode.path };
      const responseJson = await invoke<string>("create_collection", {
        listNodeInfoReq,
        collectionName: newCollectionName.trim(),
      });
      const { response_code, response_msg } =
        parseBaseResponse<unknown>(responseJson);
      createCollectionModalRef.current?.close();
      if (response_code === 0) {
        showSuccess(`Collection "${newCollectionName.trim()}" 创建成功!`);
        await handleRefreshNode(createCollectionNode);
      } else {
        showError(`创建 Collection 失败: ${response_msg}`);
      }
    } catch (err) {
      createCollectionModalRef.current?.close();
      showError(`创建 Collection 时发生错误: ${getErrorMessage(err)}`);
    }
  };

  const handleCancelCreateCollection = () => {
    setNewCollectionName("");
    setCreateCollectionNode(null);
    createCollectionModalRef.current?.close();
  };

  const handleConfirmCreateBucket = async () => {
    if (!newBucketName.trim() || !createBucketNode) return;

    try {
      const responseJson = await invoke<string>("create_bucket", {
        listNodeInfoReq: { level_infos: createBucketNode.path },
        bucketName: newBucketName.trim(),
      });
      const { response_code, response_msg } =
        parseBaseResponse<unknown>(responseJson);
      createBucketModalRef.current?.close();
      if (response_code === 0) {
        showSuccess(`Bucket "${newBucketName.trim()}" 创建成功!`);
        await handleRefreshNode(createBucketNode);
      } else {
        showError(`创建 Bucket 失败: ${response_msg}`);
      }
    } catch (err) {
      createBucketModalRef.current?.close();
      showError(`创建 Bucket 时发生错误: ${getErrorMessage(err)}`);
    }
  };

  const handleCancelCreateBucket = () => {
    setNewBucketName("");
    setCreateBucketNode(null);
    createBucketModalRef.current?.close();
  };

  const handleEditNode = async (node: TreeNode) => {
    if (node.iconName === "folder" || node.iconName === "textFile") {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const isFolder = node.iconName === "folder";
        const selected = await save({
          title: isFolder ? "选择保存位置" : "保存文件",
        });
        if (!selected) return;

        const responseJson = await invoke<string>("download_file", {
          listNodeInfoReq: { level_infos: node.path },
          destination: selected,
          isFolder: isFolder,
        });
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
    const connection = findConnectionByRootConfigId(connections, rootConfigId);
    if (!connection) {
      console.error("Connection details not found for node:", node);
      showError("无法找到数据库连接信息来编辑表详情。");
      return;
    }

    const tabId = `${node.id}-details`;
    const existingTab = tabs.find((tab) => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab: Tab = {
        id: tabId,
        name: `${node.name} [Details]`,
        icon: node.icon,
        type: "tableDetail",
        node: node,
        connectionId: connection.base_config_id,
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleDeleteQuery = async (node: TreeNode) => {
    setNodeToDelete(node);
    deleteModalRef.current?.showModal();
  };

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
        return handleRequestDeleteConnection(node);
    }
  };

  // 选中态跟随当前 tab：tab id 带前缀，需回退到 tab.node / tab.sourceNodeId
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const selectedNodeId =
    (activeTab && "node" in activeTab ? activeTab.node?.id : undefined) ??
    (activeTab?.type === "sqlEditor" ? activeTab.sourceNodeId : undefined) ??
    null;

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 gap-2 md:grid-cols-[minmax(260px,300px)_1fr]">
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
            onClick={handleOpenCreateConnection}
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
              onRowClick={handleNodeActivate}
              onToggle={handleToggleNode}
              onAction={handleTreeRowAction}
              onEditConnection={handleEditConnection}
              onDeleteConnection={handleRequestDeleteConnection}
              nodeContextMenuItems={buildNodeContextMenuItems}
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
                  onClick={handleOpenCreateConnection}
                >
                  新建连接
                </ActionButton>
              }
            />
          )}
        </div>
      </Panel>
      <TabPanel
        tabs={tabs}
        setTabs={setTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        connections={connections}
        treeData={treeData}
        onQuerySaved={updateQueryNodeNameInTree}
        onRedisKeyDeleted={handleRedisKeyDeleted}
        onKafkaTopicDeleted={handleKafkaTopicDeleted}
      />
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveSuccess={handleConnectionModalSaveSuccess}
        editingId={editingConnectionId}
      />
      <dialog
        ref={deleteModalRef}
        className="modal"
        aria-labelledby="delete-dialog-title"
      >
        <div className="modal-box">
          <h3 id="delete-dialog-title" className="font-bold text-lg">
            确认删除
          </h3>
          <p className="py-4">
            <span className="font-semibold">
              {nodeToDelete?.iconName === "singleQuery"
                ? "查询"
                : nodeToDelete?.iconName === "bucket"
                  ? "Bucket"
                  : nodeToDelete?.iconName === "folder"
                    ? "文件夹"
                    : nodeToDelete?.iconName === "textFile"
                      ? "文件"
                      : "连接"}{" "}
              “{nodeToDelete?.name}”
            </span>
            此操作不可撤销。
          </p>
          <div className="modal-action">
            <button className="btn" onClick={handleCancelDelete}>
              取消
            </button>
            <button className="btn btn-error" onClick={handleConfirmDelete}>
              确认删除
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="关闭对话框" onClick={handleCancelDelete}>
            close
          </button>
        </form>
      </dialog>

      <dialog
        ref={createCollectionModalRef}
        className="modal"
        aria-labelledby="create-collection-dialog-title"
      >
        <div className="modal-box">
          <h3 id="create-collection-dialog-title" className="font-bold text-lg">
            新建 Collection
          </h3>
          <div className="flex flex-col gap-1.5 w-full mt-4">
            <label className="label" htmlFor="new-collection-name">
              <span className="text-xs font-medium">Collection 名称</span>
            </label>
            <input
              id="new-collection-name"
              name="collectionName"
              type="text"
              placeholder="例如：orders_2024…"
              autoComplete="off"
              spellCheck={false}
              className="input w-full"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmCreateCollection();
              }}
              autoFocus
            />
          </div>
          <div className="modal-action">
            <button className="btn" onClick={handleCancelCreateCollection}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmCreateCollection}
              disabled={!newCollectionName.trim()}
            >
              创建
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCancelCreateCollection}>close</button>
        </form>
      </dialog>

      <dialog
        ref={createBucketModalRef}
        className="modal"
        aria-labelledby="create-bucket-dialog-title"
      >
        <div className="modal-box">
          <h3 id="create-bucket-dialog-title" className="font-bold text-lg">
            新建 Bucket
          </h3>
          <div className="flex flex-col gap-1.5 w-full mt-4">
            <label className="label" htmlFor="new-bucket-name">
              <span className="text-xs font-medium">Bucket 名称</span>
            </label>
            <input
              id="new-bucket-name"
              name="bucketName"
              type="text"
              placeholder="例如：backup-2024…"
              autoComplete="off"
              spellCheck={false}
              className="input w-full"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmCreateBucket();
              }}
              autoFocus
            />
          </div>
          <div className="modal-action">
            <button className="btn" onClick={handleCancelCreateBucket}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmCreateBucket}
              disabled={!newBucketName.trim()}
            >
              创建
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCancelCreateBucket}>close</button>
        </form>
      </dialog>
      <dialog
        ref={renameModalRef}
        className="modal"
        aria-labelledby="rename-dialog-title"
      >
        <div className="modal-box">
          <h3 id="rename-dialog-title" className="font-bold text-lg">
            重命名
          </h3>
          <div className="flex flex-col gap-1.5 w-full mt-4">
            <label className="label" htmlFor="rename-input">
              <span className="text-xs font-medium">新名称</span>
            </label>
            <input
              id="rename-input"
              name="newName"
              type="text"
              placeholder="请输入新名称…"
              autoComplete="off"
              spellCheck={false}
              className="input w-full"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmRename();
              }}
              autoFocus
            />
          </div>
          <div className="modal-action">
            <button className="btn" onClick={handleCancelRename}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmRename}
              disabled={
                !renameValue.trim() || renameValue.trim() === nodeToRename?.name
              }
            >
              确定
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCancelRename}>close</button>
        </form>
      </dialog>

      <dialog
        ref={copyModalRef}
        className="modal"
        aria-labelledby="copy-dialog-title"
      >
        <div className="modal-box">
          <h3 id="copy-dialog-title" className="font-bold text-lg">
            复制到其他目录
          </h3>
          <p className="py-1 text-xs text-base-content/60">
            将 “{nodeToCopy?.name}”
            {nodeToCopy?.iconName === "folder" ? "（含全部嵌套内容）" : ""}{" "}
            复制到以下 WebDAV 目录，保留原名称；目标已有同名内容时会被覆盖。
          </p>
          <div className="flex flex-col gap-1.5 w-full mt-4">
            <label className="label" htmlFor="copy-target-dir">
              <span className="text-xs font-medium">目标目录</span>
            </label>
            <input
              id="copy-target-dir"
              name="targetDir"
              type="text"
              placeholder="例如：/docs/backup，/ 表示根目录…"
              autoComplete="off"
              spellCheck={false}
              className="input w-full"
              value={copyTargetDir}
              onChange={(e) => setCopyTargetDir(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmCopy();
              }}
              autoFocus
            />
          </div>
          <div className="modal-action">
            <button className="btn" onClick={handleCancelCopy}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmCopy}
              disabled={!copyTargetDir.trim()}
            >
              复制
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCancelCopy}>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default DatabaseViewer;
