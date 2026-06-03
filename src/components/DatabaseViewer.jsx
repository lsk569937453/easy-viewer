import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import DaisyTreeNode from "./DaisyTreeNode.jsx";
import TabPanel from "./TabPanel.jsx";
import NewConnectionModal from "./NewConnectionModal.jsx";
import { DiMysql } from "react-icons/di";
import TableDetailPage from "./TableDetailPage.jsx";
import { SiOracle, SiSqlite, SiMongodb, SiRedis } from "react-icons/si";
import {
  FaTable,
  FaEye,
  FaFolder,
  FaDatabase,
  FaLayerGroup,
  FaKey,
  FaSearch,
  FaColumns,
  FaStream,
  FaStar,
  FaTerminal,
} from "react-icons/fa";

import {
  generateCreateTableSql,
  generateCreateColumnSql,
  generateCreateIndexSql,
} from "../utils/SqlUtils.jsx";

const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  postgresql: <FaDatabase size="1.2em" color="#336791" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  mongodb: <SiMongodb size="1.2em" color="#47A248" />,
  redis: <SiRedis size="1.2em" color="#DC382D" />,
  clickhouse: <FaDatabase size="1.2em" color="#FFCC00" />,
  elasticsearch: <FaDatabase size="1.2em" color="#FEC514" />,
  s3: <FaDatabase size="1.2em" color="#FF9900" />,
  kafka: <FaStream size="1.2em" color="#231F20" />,
  rocketmq: <FaStream size="1.2em" color="#D4213D" />,
  table: <FaTable />,
  view: <FaEye />,
  query: <FaSearch />,
  tables: <FaColumns />,
  views: <FaEye />,
  singleTable: <FaTable />,
  partitions: <FaLayerGroup />,
  columns: <FaColumns />,
  index: <FaKey />,
  singlePrimaryIndex: <FaStar />,
  singleCommonIndex: <FaKey />,
  column: <FaStream />,
  primary: <FaStar />,
  default: <FaFolder />,
  singleQuery: <FaDatabase />,
  // Kafka specific icons
  kafka_topics: <FaColumns color="#00A0E4" />,
  kafka_single_topic: <FaStream color="#00A0E4" />,
  kafka_partitions: <FaLayerGroup color="#7B68EE" />,
  kafka_single_partition: <FaLayerGroup color="#9370DB" />,
  kafka_messages: <FaStream color="#FF6B6B" />,
  kafka_consumer_groups: <FaDatabase color="#50C878" />,
  kafka_single_consumer_group: <FaDatabase color="#3CB371" />,
  kafka_brokers: <FaDatabase color="#FFB347" />,
  kafka_single_broker: <FaDatabase color="#FFA500" />,
  kafka_config: <FaKey color="#DDA0DD" />,
  // RocketMQ specific icons
  rocketmq_topics: <FaColumns color="#D4213D" />,
  rocketmq_single_topic: <FaStream color="#D4213D" />,
  rocketmq_messages: <FaStream color="#FF6B6B" />,
  // Redis specific icons
  redis_keys: <FaColumns color="#DC382D" />,
  strings: <FaStream color="#FF6B6B" />,
  hashes: <FaLayerGroup color="#7B68EE" />,
  lists: <FaColumns color="#50C878" />,
  sets: <FaStar color="#FFB347" />,
  zsets: <FaKey color="#DDA0DD" />,
  redis_console: <FaTerminal color="#DC382D" />,
  // Elasticsearch specific icons
  es_indices: <FaColumns color="#FEC514" />,
  // S3 / OSS specific icons
  bucket: <FaDatabase size="1.2em" color="#FF9900" />,
  folder: <FaFolder color="#FFB347" />,
  textFile: <FaEye color="#87CEEB" />,
};

const getNodeIcon = (nodeType, iconName) => {
  const key = iconName?.toString() || nodeType?.toString() || "default";
  return ICON_MAP[key] || ICON_MAP.default;
};

const updateNodeInTree = (nodes, nodeId, updates) => {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      const updatedChildren = updateNodeInTree(node.children, nodeId, updates);
      if (updatedChildren !== node.children) {
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });
};

const findConnectionByRootConfigId = (connections, rootConfigId) => {
  return connections.find(
    (conn) => conn.base_config_id.toString() === rootConfigId
  );
};

function DatabaseViewer({
  connections,
  onConnectionUpdated,
  onConnectionDeleted,
}) {
  const [treeData, setTreeData] = useState([]);
  const [openNodes, setOpenNodes] = useState({});
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState(null);

  const [nodeToDelete, setNodeToDelete] = useState(null);
  const deleteModalRef = useRef(null);

  const openNodesRef = useRef(openNodes);
  useEffect(() => {
    openNodesRef.current = openNodes;
  }, [openNodes]);

  const fetchNodeChildren = useCallback(async (parentNode) => {
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, parentNode.id, { isLoading: true })
    );

    try {
      const listNodeInfoReq = { level_infos: parentNode.path };
      const responseJson = await invoke("list_node_info", {
        listNodeInfoReq,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);
      if (response_code === 0) {
        let childNodes = [];

        setTreeData((prevTree) => {
          // Find existing children to preserve their loaded sub-trees and avoid flicker
          const existingChildrenByName = {};
          const findNode = (nodes, id) => {
            for (const n of nodes) {
              if (n.id === id) return n;
              if (n.children) {
                const found = findNode(n.children, id);
                if (found) return found;
              }
            }
            return null;
          };
          const existingParent = findNode(prevTree, parentNode.id);
          if (existingParent?.children) {
            for (const c of existingParent.children) {
              existingChildrenByName[c.name] = c;
            }
          }

          childNodes = response_msg.list.map((child, index) => {
            const existing = existingChildrenByName[child.name];
            return {
              id: `${parentNode.id}-${child.name}-${index}`,
              name: child.name,
              type: child.type || "default",
              icon: getNodeIcon(child.type, child.icon_name),
              description: child.description || "",
              iconName: child.icon_name,
              details: `节点: ${child.name}\n类型: ${child.type || "未知"}`,
              // Preserve old children if available to avoid flicker on refresh
              children: existing?.children ?? null,
              path: [
                ...parentNode.path,
                { level: parentNode.path.length + 1, config_value: child.name },
              ],
            };
          });

          return updateNodeInTree(prevTree, parentNode.id, {
            children: childNodes,
            isLoading: false,
          });
        });

        const currentOpenNodes = openNodesRef.current;
        childNodes.forEach(async (childNode) => {
          if (currentOpenNodes[childNode.id]) {
            await fetchNodeChildren(childNode);
          }
        });
      } else {
        throw new Error(response_msg);
      }
    } catch (error) {
      console.error("Failed to fetch node children:", error);
      setTreeData((prevTree) =>
        updateNodeInTree(prevTree, parentNode.id, {
          children: [],
          isLoading: false,
        })
      );
    }
  }, []);

  const updateQueryNodeNameInTree = useCallback((queryIdToUpdate, newName) => {
    setTreeData((prevTree) => {
      const findAndUpdate = (nodes) => {
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
  }, []);

  useEffect(() => {
    const newTreeData = (connections || []).map((conn) => {
      const dbTypeMap = { 0: "mysql", 1: "postgresql", 2: "kafka", 3: "sqlite", 4: "mongodb", 5: "oracle", 6: "mssql", 7: "clickhouse", 8: "s3", 9: "redis", 10: "elasticsearch", 11: "rocketmq" };
      const dbType = dbTypeMap[conn.connection_type] || "default";

      return {
        id: conn.base_config_id,
        name: conn.connection_name,
        type: dbType,
        icon: getNodeIcon(dbType, null),
        iconName: dbType,
        description: conn.description,
        details: `ID: ${
          conn.base_config_id
        }\n类型: ${dbType.toUpperCase()}\n主机: ${conn.host || "N/A"}:${
          conn.port || "N/A"
        }`,
        children: null,
        path: [{ level: 1, config_value: conn.base_config_id.toString() }],
      };
    });
    setTreeData(newTreeData);

    const currentOpenNodes = openNodesRef.current;
    newTreeData.forEach(async (node) => {
      if (currentOpenNodes[node.id] && node.children === null) {
        await fetchNodeChildren(node);
      }
    });
  }, [connections, fetchNodeChildren]);

  const generateSqlForNode = (node, allConnections, limit = 100) => {
    if (!node || node.iconName !== "singleTable") {
      return "此节点类型不适用于SQL生成。";
    }

    const rootConfigId = node.path[0].config_value;
    const connection = allConnections.find(
      (conn) => conn.base_config_id.toString() === rootConfigId
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
          node.path.length > 2
            ? node.path[1].config_value
            : "public";
        return `SELECT * FROM "${pgSchemaName}"."${tableName}" LIMIT ${limit};`;
      }
      case 6: {
        // MSSQL
        const mssqlDatabaseName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        const mssqlSchemaName =
          node.path.length > 4
            ? node.path[3].config_value
            : "dbo";
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
    connectionId,
    nodeIcon,
    generatedSql = "",
    defaultName = ""
  ) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
    const finalQueryName = defaultName || `New_Query_${timestamp}`;

    try {
      const responseJson = await invoke("save_query", {
        connectionId: connectionId,
        queryName: finalQueryName,
        sql: generatedSql,
        queryId: null,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        const { query_id } = response_msg;
        const newTabId = `sql-editor-${query_id || Date.now()}`;

        const existingSqlEditorTab = tabs.find(
          (tab) => tab.type === "sqlEditor" && tab.queryId === query_id
        );

        if (existingSqlEditorTab) {
          setActiveTabId(existingSqlEditorTab.id);
          if (
            generatedSql &&
            existingSqlEditorTab.initialSql !== generatedSql
          ) {
            setTabs((prevTabs) =>
              prevTabs.map((t) =>
                t.id === existingSqlEditorTab.id
                  ? { ...t, initialSql: generatedSql, isDirty: true }
                  : t
              )
            );
          }
        } else {
          const newTab = {
            id: newTabId,
            name: finalQueryName,
            icon: nodeIcon,
            type: "sqlEditor",
            connectionId: connectionId,
            queryId: query_id,
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
          response_msg
        );
        alert(`创建新查询失败: ${response_msg}`);
        return false;
      }
    } catch (err) {
      console.error("Error invoking save_query for new query:", err);
      alert(`创建新查询时发生错误: ${err.message || err.toString()}`);
      return false;
    }
  };

  const handleNodeActivate = async (node) => {
    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      console.error("Connection details not found for node:", node);
      alert("无法找到数据库连接信息。");
      return;
    }

    if (node.iconName === "singleQuery") {
      const queryId = node.path[node.path.length - 1].config_value;
      const newTabId = `sql-editor-${queryId}`;

      const existingSqlEditorTab = tabs.find(
        (tab) => tab.type === "sqlEditor" && tab.queryId === queryId
      );
      if (existingSqlEditorTab) {
        setActiveTabId(existingSqlEditorTab.id);
      } else {
        const newTab = {
          id: newTabId,
          name: node.name,
          icon: node.icon,
          type: "sqlEditor",
          connectionId: connection.base_config_id,
          queryId: queryId,
          initialSql: null,
          isDirty: false,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    } else if (node.iconName === "singleTable") {
      const rootConfigId = node.path[0]?.config_value;
      const connection = findConnectionByRootConfigId(connections, rootConfigId);

      // Redis key — use dedicated RedisKeyDetailPanel
      if (connection && connection.connection_type === 9) {
        const keyName = node.name;
        const tabId = `redis-key-${node.id}`;
        const existingTab = tabs.find((tab) => tab.id === tabId);
        if (existingTab) {
          setActiveTabId(existingTab.id);
        } else {
          const newTab = {
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

      const tableId = node.path[node.path.length - 1].config_value;
      const newTabId = `singleTable-${tableId}`;
      const existingSqlEditorTab = tabs.find(
        (tab) => tab.type === "singleTable" && tab.id === newTabId
      );
      if (existingSqlEditorTab) {
        setActiveTabId(existingSqlEditorTab.id);
      } else {
        let sql = generateSqlForNode(node, connections);

        const newTab = {
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
        const newTab = {
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
        const newTab = {
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
        const newTab = {
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
  const handleKafkaNodeActivate = async (node, connection) => {
    const nodeType = node.iconName;

    // Topic 消息查看
    if (nodeType === "kafka_messages" || nodeType === "kafka_single_topic") {
      const topicName = node.path[node.path.length - 1]?.config_value || node.name;
      const tabId = `kafka-messages-${node.id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab = {
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
        const newTab = {
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
  const handleRocketmqNodeActivate = async (node, connection) => {
    const nodeType = node.iconName;

    // Topic 消息查看
    if (nodeType === "rocketmq_messages" || nodeType === "rocketmq_single_topic") {
      const topicName = node.path[node.path.length - 1]?.config_value || node.name;
      const tabId = `rocketmq-messages-${node.id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab = {
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
  const handleRedisNodeActivate = async (node, connection) => {
    const nodeType = node.iconName;

    // Console 节点
    if (nodeType === "redis_console") {
      const tabId = `redis-console-${connection.base_config_id}`;

      const existingTab = tabs.find((tab) => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab = {
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

  const handleToggleNode = async (node) => {
    const isCurrentlyOpen = openNodes[node.id];

    setOpenNodes((prev) => ({ ...prev, [node.id]: !isCurrentlyOpen }));

    if (!isCurrentlyOpen && node.children === null) {
      await fetchNodeChildren(node);
    }
  };

  const handleRefreshNode = async (node) => {
    // Don't clear children — keep old data visible while loading to avoid flicker
    await fetchNodeChildren(node);
    setOpenNodes((prev) => ({ ...prev, [node.id]: true }));
  };

  // Remove a Redis key node from the tree and close its tab
  const handleRedisKeyDeleted = (node) => {
    const tabId = `redis-key-${node.id}`;

    // Remove node from tree
    setTreeData((prevTree) => {
      const removeFromTree = (nodes) =>
        nodes
          .map((n) => {
            if (n.id === node.id) return null;
            if (n.children) {
              const updated = removeFromTree(n.children);
              if (updated !== n.children) {
                return { ...n, children: updated };
              }
            }
            return n;
          })
          .filter(Boolean);
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
          remaining.length > 0 ? remaining[remaining.length - 1].id : null
        );
      }
      return remaining;
    });
  };

  const handleAddNode = async (node) => {
    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      alert("无法找到数据库连接信息来执行此操作。");
      return;
    }

    const connectionId = parseInt(rootConfigId);
    const connectionType = connection.connection_type;
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
        alert("无法确定表名来生成 CREATE COLUMN SQL。");
        return;
      }
      generatedSql = generateCreateColumnSql(connectionType, tableName);
      defaultQueryName = `Add_Column_to_${tableName}`;
    } else if (node.iconName === "index") {
      const tableName = node.path[node.path.length - 2]?.config_value;
      if (!tableName) {
        alert("无法确定表名来生成 CREATE INDEX SQL。");
        return;
      }
      generatedSql = generateCreateIndexSql(connectionType, tableName);
      defaultQueryName = `Add_Index_to_${tableName}`;
    } else if (node.iconName === "kafka_topics") {
      // 创建新 Kafka Topic
      const topicName = prompt("请输入新 Topic 名称:");
      if (!topicName) return;

      const numPartitions = parseInt(prompt("请输入分区数 (默认 1):", "1") || "1");
      const replicationFactor = parseInt(prompt("请输入副本因子 (默认 1):", "1") || "1");

      try {
        const responseJson = await invoke("kafka_create_topic", {
          connectionId: connectionId,
          topic: topicName,
          numPartitions: numPartitions,
          replicationFactor: replicationFactor,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0) {
          alert(`Topic "${topicName}" 创建成功!`);
          await handleRefreshNode(node);
        } else {
          alert(`创建 Topic 失败: ${response_msg}`);
        }
      } catch (err) {
        alert(`创建 Topic 时发生错误: ${err.message || err.toString()}`);
      }
      return;
    } else {
      alert(
        `触发了"新增"操作，目标节点: ${node.name}，但此节点类型不支持生成SQL。`
      );
      return;
    }

    const success = await openSqlEditorTabWithContent(
      connectionId,
      node.icon,
      generatedSql,
      defaultQueryName
    );

    if (node.iconName === "query" && success) {
      await handleRefreshNode(node);
    }
  };

  const handleEditConnection = (node) => {
    setEditingConnectionId(node.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConnectionId(null);
  };

  const handleConnectionModalSaveSuccess = (baseConfigId, isEditMode) => {
    if (onConnectionUpdated) {
      onConnectionUpdated(baseConfigId);
    }
  };

  const handleRequestDeleteConnection = (node) => {
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
        alert("无法获取完整的查询信息来删除。");
        setNodeToDelete(null);
        deleteModalRef.current?.close();
        return;
      }

      try {
        const responseJson = await invoke("remove_query", {
          baseConfigId: parseInt(baseConfigId),
          queryName: queryName,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0) {
          setTreeData((prevTree) => {
            const removeQueryNode = (nodes) => {
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
                .filter(Boolean);
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
                !(tab.type === "sqlEditor" && tab.queryId === parseInt(queryId))
            );
            if (
              activeTabId &&
              !remainingTabs.some((tab) => tab.id === activeTabId)
            ) {
              setActiveTabId(
                remainingTabs.length > 0 ? remainingTabs[0].id : null
              );
            }
            return remainingTabs;
          });
        } else {
          console.error("Failed to delete query:", response_msg);
          alert(`删除查询失败: ${response_msg}`);
        }
      } catch (err) {
        console.error("Error invoking remove_query:", err);
        alert(`删除查询时发生错误: ${err.message || err.toString()}`);
      } finally {
        setNodeToDelete(null);
        deleteModalRef.current?.close();
      }
    } else {
      const connectionIdToDelete = nodeToDelete.id;

      try {
        const responseJson = await invoke("delete_base_config", {
          baseConfigId: connectionIdToDelete,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0) {
          setOpenNodes((prevOpenNodes) => {
            const newOpenNodes = { ...prevOpenNodes };
            delete newOpenNodes[connectionIdToDelete];
            return newOpenNodes;
          });

          setTabs((prevTabs) => {
            const remainingTabs = prevTabs.filter(
              (tab) => tab.connectionId !== connectionIdToDelete
            );

            if (
              activeTabId &&
              !remainingTabs.some((tab) => tab.id === activeTabId)
            ) {
              setActiveTabId(
                remainingTabs.length > 0 ? remainingTabs[0].id : null
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
            response_msg
          );
          alert(`删除连接失败: ${response_msg}`);
        }
      } catch (err) {
        console.error("Error invoking delete_base_config:", err);
        alert(`删除连接时发生错误: ${err.message || err.toString()}`);
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

  const handleEditNode = (node) => {
    if (node.iconName !== "singleTable") return;

    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);
    if (!connection) {
      console.error("Connection details not found for node:", node);
      alert("无法找到数据库连接信息来编辑表详情。");
      return;
    }

    const tabId = `${node.id}-details`;
    const existingTab = tabs.find((tab) => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab = {
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

  const handleDeleteQuery = async (node) => {
    setNodeToDelete(node);
    deleteModalRef.current?.showModal();
  };

  return (
    <div className="grid h-full w-full grid-cols-1 gap-3 md:grid-cols-[minmax(280px,_1fr)_3fr]">
      <div className="flex flex-col overflow-hidden rounded-md bg-base-100 border border-base-content/5">
        <div className="flex-shrink-0 border-b border-base-content/5 px-3 py-2">
          <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider">导航</h2>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
          {treeData && treeData.length > 0 ? (
            <ul className="menu p-0">
              {treeData.map((rootNode) => (
                <DaisyTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  selectedNode={tabs.find((tab) => tab.id === activeTabId)}
                  openNodes={openNodes}
                  onNodeClick={handleNodeActivate}
                  onToggle={handleToggleNode}
                  onRefresh={handleRefreshNode}
                  onAdd={handleAddNode}
                  onEdit={handleEditNode}
                  onEditConnection={handleEditConnection}
                  onDelete={handleRequestDeleteConnection}
                  onDeleteConnection={handleRequestDeleteConnection}
                  onDeleteQuery={handleDeleteQuery}
                />
              ))}
            </ul>
          ) : (
            <div className="text-center text-base-content/40 p-6">
              <p className="text-sm">暂无数据库连接</p>
              <p className="text-xs mt-2">
                请通过 "连接" &gt; "新建连接..." 添加
              </p>
            </div>
          )}
        </div>
      </div>
      <TabPanel
        tabs={tabs}
        setTabs={setTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        connections={connections}
        treeData={treeData}
        onQuerySaved={updateQueryNodeNameInTree}
        onRedisKeyDeleted={handleRedisKeyDeleted}
      />
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveSuccess={handleConnectionModalSaveSuccess}
        editingId={editingConnectionId}
      />
      <dialog ref={deleteModalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">确认删除</h3>
          <p className="py-4">
            <span className="font-semibold">
              {nodeToDelete?.iconName === "singleQuery" ? "查询" : "连接"} "
              {nodeToDelete?.name}"
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
          <button onClick={handleCancelDelete}>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default DatabaseViewer;
