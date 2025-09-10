import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DaisyTreeNode from "./DaisyTreeNode.jsx";
import TabPanel from "./TabPanel.jsx"; // 1. 导入 TabPanel 组件
import NewConnectionModal from "./NewConnectionModal.jsx";
import { DiMysql } from "react-icons/di";
import TableDetailPage from "./TableDetailPage.jsx"; // 1. Import the new component

import { SiOracle, SiSqlite } from "react-icons/si";
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
} from "react-icons/fa";

const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  table: <FaTable />,
  view: <FaEye />,
  query: <FaSearch />,
  tables: <FaColumns />,
  views: <FaEye />,
  singleTable: <FaTable />,
  partitions: <FaLayerGroup />,
  columns: <FaColumns />,
  index: <FaKey />,
  column: <FaStream />,
  primary: <FaStar />,
  default: <FaFolder />,
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

// Helper function to find connection by rootConfigId
const findConnectionByRootConfigId = (connections, rootConfigId) => {
  return connections.find(
    (conn) => conn.base_config_id.toString() === rootConfigId
  );
};

function DatabaseViewer({ connections, onConnectionsUpdate }) {
  const [treeData, setTreeData] = useState([]);
  const [openNodes, setOpenNodes] = useState({});
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState(null);

  useEffect(() => {
    const newTreeData = (connections || []).map((conn) => {
      const dbTypeMap = { 1: "mysql", 2: "oracle", 3: "sqlite" };
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
        }\n类型: ${dbType.toUpperCase()}\n主机: ${conn.host}:${conn.port}`,
        children: null,
        path: [{ level: 1, config_value: conn.base_config_id.toString() }],
      };
    });
    setTreeData(newTreeData);
  }, [connections]);

  const generateSqlForNode = (node, allConnections, limit = 100) => {
    if (!node || node.iconName !== "singleTable") {
      return "此节点类型不适用于SQL生成。";
    }

    const rootConfigId = node.path[0].config_value;
    const connection = allConnections.find(
      (conn) => conn.base_config_id.toString() === rootConfigId
    );

    if (!connection) {
      return `/* 错误: 无法找到连接信息来生成SQL */\nSELECT * FROM "${node.name}" LIMIT ${limit};`;
    }

    const dbType = connection.connection_type;
    const tableName = node.name;

    switch (dbType) {
      case 1: // MySQL
        const mysqlDatabaseName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM \`${mysqlDatabaseName}\`.\`${tableName}\` LIMIT ${limit};`;
      case 2: // Oracle
        const oracleSchemaName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM "${oracleSchemaName}"."${tableName}" WHERE ROWNUM <= ${limit};`;
      case 3: // SQLite
        return `SELECT * FROM "${tableName}" LIMIT ${limit};`;
      default:
        return `SELECT * FROM "${tableName}" LIMIT ${limit}; /* 未知数据库类型，使用通用查询 */`;
    }
  };

  // 辅助函数：打开一个新的 SQL Editor 标签页
  const openNewSqlEditorTab = async (
    connectionId,
    connectionName,
    nodeIcon
  ) => {
    const defaultQueryName = `新查询 - ${connectionName}`;
    const defaultSqlContent = "";

    try {
      const responseJson = await invoke("save_query", {
        connectionId: connectionId,
        queryName: defaultQueryName,
        sql: defaultSqlContent,
        queryId: null,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        // 假设 response_msg 包含新查询的 query_id
        const { query_id } = response_msg;
        const newTabId = `sql-editor-${query_id}`; // 为新标签页生成一个唯一 ID

        // 检查是否已经存在该 query_id 对应的 SQL 编辑器标签页
        const existingSqlEditorTab = tabs.find(
          (tab) => tab.type === "sqlEditor" && tab.queryId === query_id
        );

        if (existingSqlEditorTab) {
          setActiveTabId(existingSqlEditorTab.id);
        } else {
          const newTab = {
            id: newTabId,
            name: defaultQueryName,
            icon: nodeIcon,
            type: "sqlEditor", // 标识为 SQL 编辑器类型
            connectionId: connectionId,
            queryId: query_id, // 后端返回的新查询 ID
            initialSql: defaultSqlContent,
          };
          setTabs((prevTabs) => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        }
      } else {
        console.error(
          "Failed to create new query via save_query:",
          response_msg
        );
        alert(`创建新查询失败: ${response_msg}`);
      }
    } catch (err) {
      console.error("Error invoking save_query for new query:", err);
      alert(`创建新查询时发生错误: ${err.message || err.toString()}`);
    }
  };

  const handleNodeActivate = async (node) => {
    // Determine the root connection ID from the node's path
    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      console.error("Connection details not found for node:", node);
      alert("无法找到数据库连接信息。");
      return;
    }

    // --- 取消处理 'query' 节点点击的行为 ---
    if (node.iconName === "query") {
      // 这里的逻辑已被移除，点击 'query' 节点时将不做任何操作。
      // 如果需要，可以在这里添加一个 console.log 或其他提示，表示此操作已被禁用。
      console.log(
        `点击了 'query' 节点 (${node.name})，但此操作已被禁用。请使用右侧的“新增”按钮。`
      );
      return; // 阻止进一步处理
    }

    // --- 现有逻辑处理其他节点类型 ---

    // 检查标签页是否已经存在 (对于 node.id 稳定的其他节点类型)
    const existingTab = tabs.find((tab) => tab.id === node.id);

    if (node.iconName === "singleTable") {
      let tabDetails = generateSqlForNode(node, connections);
      if (existingTab) {
        // For TableWorkspacePanel, we might want to update initialSql if the node's details changed
        if (existingTab.initialSql !== tabDetails) {
          setTabs((prevTabs) =>
            prevTabs.map((tab) =>
              tab.id === node.id ? { ...tab, initialSql: tabDetails } : tab
            )
          );
        }
        setActiveTabId(node.id);
      } else {
        const newTab = {
          id: node.id,
          name: node.name,
          icon: node.icon,
          initialSql: tabDetails,
          iconName: node.iconName,
          path: node.path,
          type: "tableWorkspace", // Explicit type for TableWorkspacePanel
          connectionId: connection.base_config_id,
          activeTabNode: node, // Pass node directly
          connectionDetails: connection, // Pass connection directly
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return; // Done with singleTable
    }

    // Default info tab (if not 'query' and not 'singleTable')
    let tabDetails = node.details;
    if (existingTab) {
      if (existingTab.details !== tabDetails) {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === node.id ? { ...tab, details: tabDetails } : tab
          )
        );
      }
      setActiveTabId(node.id);
    } else {
      const newTab = {
        id: node.id,
        name: node.name,
        icon: node.icon,
        details: tabDetails,
        iconName: node.iconName,
        path: node.path,
        type: "info", // Default info tab
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const fetchNodeChildren = async (node) => {
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, node.id, { isLoading: true })
    );

    try {
      const listNodeInfoReq = { level_infos: node.path };
      const responseJson = await invoke("list_node_info", { listNodeInfoReq });
      const { response_code, response_msg } = JSON.parse(responseJson);
      if (response_code === 0) {
        const childNodes = response_msg.list.map((child, index) => ({
          id: `${node.id}-${child.name}-${index}`,
          name: child.name,
          type: child.type || "default",
          icon: getNodeIcon(child.type, child.icon_name),
          description: child.description || "",
          iconName: child.icon_name,
          details: `节点: ${child.name}\n类型: ${child.type || "未知"}`,
          children: null,
          path: [
            ...node.path,
            { level: node.path.length + 1, config_value: child.name },
          ],
        }));

        setTreeData((prevTree) =>
          updateNodeInTree(prevTree, node.id, {
            children: childNodes,
            isLoading: false,
          })
        );
      } else {
        throw new Error(response_msg);
      }
    } catch (error) {
      console.error("Failed to fetch node children:", error);
      setTreeData((prevTree) =>
        updateNodeInTree(prevTree, node.id, {
          children: [],
          isLoading: false,
        })
      );
    }
  };

  const handleToggleNode = async (node) => {
    if (node.children === null) {
      await fetchNodeChildren(node);
    }
    setOpenNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
  };

  const handleRefreshNode = async (node) => {
    console.log("Refreshing node:", node.name);
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, node.id, { children: null })
    );
    await fetchNodeChildren(node);
    setOpenNodes((prev) => ({ ...prev, [node.id]: true }));
  };

  // handleAddNode 函数保持不变，因为它是点击“新增”按钮时的行为
  const handleAddNode = async (node) => {
    console.log("Add action on node:", node.name);
    if (node.iconName === "query") {
      console.log("node:", node);
      const rootConfigId = node.path[0]?.config_value;
      const connection = findConnectionByRootConfigId(
        connections,
        rootConfigId
      );
      if (connection) {
        await openNewSqlEditorTab(
          parseInt(rootConfigId),
          connection.connection_name,
          node.icon
        );
      } else {
        alert("无法找到数据库连接信息来创建新查询。");
      }
    } else {
      alert(`触发了“新增”操作，目标节点: ${node.name}`);
    }
  };

  const handleEditConnection = (node) => {
    console.log("Editing connection:", node.name, "with ID:", node.id);
    setEditingConnectionId(node.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConnectionId(null);
  };

  const handleCreationSuccess = () => {
    if (onConnectionsUpdate) {
      onConnectionsUpdate();
    }
  };

  const handleDeleteConnection = (node) => {
    console.log("删除连接:", node);
  };
  const handleEditNode = (node) => {
    if (node.iconName !== "singleTable") return;

    const tabId = `${node.id}-details`; // Create a unique ID for the detail tab
    const existingTab = tabs.find((tab) => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab = {
        id: tabId,
        name: `${node.name} [Details]`, // Differentiate the tab name
        icon: node.icon,
        type: "tableDetail", // 2. Add a type to identify this special tab
        node: node, // Pass the full node data
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(tabId);
    }
  };
  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-[minmax(350px,_1fr)_2fr]">
      <div className="flex flex-col overflow-hidden rounded-lg bg-base-100 shadow-lg">
        <div className="flex-shrink-0 border-b p-4">
          <h2 className="text-xl font-bold">数据库导航</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
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
                  onAdd={handleAddNode} // 确保这里传递了 handleAddNode
                  onEdit={handleEditNode}
                  onEditConnection={handleEditConnection}
                  onDeleteConnection={handleDeleteConnection}
                />
              ))}
            </ul>
          ) : (
            <div className="text-center text-base-content/60 p-4">
              <p>暂无数据库连接。</p>
              <p className="text-sm mt-2">
                请通过 "连接" &gt; "新建连接..." 添加一个新的数据库连接。
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
      />
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreationSuccess={handleCreationSuccess}
        editingId={editingConnectionId}
      />
    </div>
  );
}

export default DatabaseViewer;
