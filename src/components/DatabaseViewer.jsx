import React, { useState, useEffect, useRef } from "react"; // 1. 导入 useRef
import { invoke } from "@tauri-apps/api/core";
import DaisyTreeNode from "./DaisyTreeNode.jsx";
import { DiMysql } from "react-icons/di";
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
  FaTimes,
} from "react-icons/fa";
import TableDetailPanel from "./TableDetailPanel.jsx";

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

function TabPanel({
  tabs,
  setTabs,
  activeTabId,
  setActiveTabId,
  connections,
  treeData,
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTabId, setSelectedTabId] = useState(null);

  const tabPanelContainerRef = useRef(null);

  const handleContextMenu = (e, tabId) => {
    e.preventDefault();
    setMenuVisible(true);

    if (tabPanelContainerRef.current) {
      const rect = tabPanelContainerRef.current.getBoundingClientRect();

      setMenuPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      setMenuPosition({ x: e.clientX, y: e.clientY });
    }
    setSelectedTabId(tabId);
  };

  const handleClickOutside = () => {
    setMenuVisible(false);
  };

  useEffect(() => {
    if (menuVisible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuVisible]);

  const handleCloseTab = (tabId) => {
    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(updatedTabs);

    if (activeTabId === tabId) {
      if (updatedTabs.length > 0) {
        setActiveTabId(updatedTabs[updatedTabs.length - 1].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleCloseLeft = () => {
    if (!selectedTabId) return;
    const currentIndex = tabs.findIndex((tab) => tab.id === selectedTabId);
    const updatedTabs = tabs.slice(currentIndex);
    setTabs(updatedTabs);
    setActiveTabId(updatedTabs[0]?.id || null);
    setMenuVisible(false);
  };

  const handleCloseRight = () => {
    if (!selectedTabId) return;
    const currentIndex = tabs.findIndex((tab) => tab.id === selectedTabId);
    const updatedTabs = tabs.slice(0, currentIndex + 1);
    setTabs(updatedTabs);
    if (activeTabId && !updatedTabs.find((tab) => tab.id === activeTabId)) {
      setActiveTabId(updatedTabs[updatedTabs.length - 1]?.id || null);
    }
    setMenuVisible(false);
  };

  const handleCloseAll = () => {
    setTabs([]);
    setActiveTabId(null);
    setMenuVisible(false);
  };

  const handleTabClick = (tabId) => {
    setActiveTabId(tabId);
  };

  // 辅助函数：根据节点ID查找完整的节点对象
  const findNodeInTree = (nodes, nodeId) => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      if (node.children) {
        const found = findNodeInTree(node.children, nodeId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  return (
    <div
      ref={tabPanelContainerRef}
      className="flex flex-col overflow-hidden rounded-lg bg-base-100 shadow-lg relative"
    >
      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="flex border-b bg-base-200">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center px-4 py-2 cursor-pointer border-r border-base-300
                flex-1 min-w-[80px] max-w-[200px]
                ${
                  activeTabId === tab.id
                    ? "bg-base-100 text-primary font-semibold"
                    : "text-base-content/60 hover:bg-base-300"
                }
              `}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            >
              <span className="mr-2 flex-shrink-0">{tab.icon}</span>
              <span className="truncate flex-grow">{tab.name}</span>
              <button
                className="ml-2 text-base-content/60 hover:text-error flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
              >
                <FaTimes size="0.9em" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {activeTabId && tabs.length > 0 ? (
          (() => {
            const activeTab = tabs.find((tab) => tab.id === activeTabId);
            if (!activeTab) return null;

            const activeNode = findNodeInTree(treeData, activeTabId);

            // 检查 activeNode 是否为 singletable 类型
            if (activeNode && activeNode.iconName === "singleTable") {
              // 找到根连接的配置 ID
              const rootConfigId = activeNode.path[0].config_value;
              // 根据配置 ID 查找完整的连接对象
              const connection = connections.find(
                (conn) => conn.base_config_id.toString() === rootConfigId
              );

              return (
                <TableDetailPanel
                  initialSql={activeTab.details} // activeTab.details 已经包含了生成的 SQL
                  activeTabNode={activeNode} // 传递完整的节点信息
                  connectionDetails={connection} // 传递根连接的详情
                />
              );
            } else {
              // 如果不是 singletable 类型，或者 activeNode 找不到，则显示默认详情
              return (
                <div className="p-6">
                  <h1 className="text-3xl font-bold mb-4 text-primary flex items-center">
                    {activeTab.icon && (
                      <span className="mr-3">{activeTab.icon}</span>
                    )}
                    {activeTab.name}
                  </h1>
                  <div className="divider"></div>
                  <pre className="text-base-content/80 whitespace-pre-wrap bg-base-200 p-4 rounded-md">
                    {activeTab.details || "暂无详细描述。"}
                  </pre>
                </div>
              );
            }
          })()
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-base-content/60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <p className="mt-4 text-lg">请从左侧列表中选择一个节点</p>
            </div>
          </div>
        )}
      </div>
      {/* Context Menu */}
      {menuVisible && (
        <div
          className="absolute z-50 bg-base-100 shadow-lg rounded-md p-2"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <ul className="menu menu-compact">
            <li onClick={handleCloseLeft}>
              <a>关闭标签左边页面</a>
            </li>
            <li onClick={handleCloseRight}>
              <a>关闭右边页面</a>
            </li>
            <li onClick={handleCloseAll}>
              <a>关闭所有页面</a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function DatabaseViewer({ connections }) {
  const [treeData, setTreeData] = useState([]);
  const [openNodes, setOpenNodes] = useState({});
  const [tabs, setTabs] = useState([]); // Store open tabs
  const [activeTabId, setActiveTabId] = useState(null); // Track active tab

  useEffect(() => {
    const newTreeData = (connections || []).map((conn) => {
      const dbTypeMap = { 1: "mysql", 2: "oracle", 3: "sqlite" };
      const dbType = dbTypeMap[conn.connection_type] || "default";

      return {
        id: `conn-${conn.base_config_id}`,
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

  // Helper function to generate SQL query based on node and connections
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

    const dbType = connection.connection_type; // 1: mysql, 2: oracle, 3: sqlite
    const tableName = node.name; // For singletable nodes, the name is the table name.

    switch (dbType) {
      case 1: // MySQL
        // MySQL often uses `database.table`. Assuming connection_name is the database name.
        // For MySQL, the database name is typically the connection name itself
        // You might need to adjust this if your connection_name is not the database name.
        // A more robust solution might retrieve database name from a parent node.
        const mysqlDatabaseName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM \`${mysqlDatabaseName}\`.\`${tableName}\` LIMIT ${limit};`;
      case 2: // Oracle
        // Oracle generally uses `SCHEMA.TABLE`. Assuming connection_name is the schema name.
        const oracleSchemaName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM "${oracleSchemaName}"."${tableName}" WHERE ROWNUM <= ${limit};`;
      case 3: // SQLite
        // SQLite typically just uses the table name.
        return `SELECT * FROM "${tableName}" LIMIT ${limit};`;
      // If other connection types (like MongoDB type 4, SQL Server type 6 from the example)
      // are added in the future, their cases should be included here.
      default:
        return `SELECT * FROM "${tableName}" LIMIT ${limit}; /* 未知数据库类型，使用通用查询 */`;
    }
  };

  const handleNodeActivate = (node) => {
    const existingTab = tabs.find((tab) => tab.id === node.id);

    let tabDetails = node.details; // Default details from node property

    // If it's a singletable node, generate SQL
    if (node.iconName === "singleTable") {
      tabDetails = generateSqlForNode(node, connections);
    }

    if (existingTab) {
      // If the tab already exists, update its details if it's a singletable
      // or if the details have somehow changed, then activate it.
      if (existingTab.details !== tabDetails) {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === node.id ? { ...tab, details: tabDetails } : tab
          )
        );
      }
      setActiveTabId(node.id);
    } else {
      // Create a new tab
      const newTab = {
        id: node.id,
        name: node.name,
        icon: node.icon,
        details: tabDetails,
        iconName: node.iconName, // 必须传递 iconName
        path: node.path, // 必须传递 path
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(node.id);
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

    setOpenNodes((prev) => ({
      ...prev,
      [node.id]: !prev[node.id],
    }));
  };

  const handleRefreshNode = async (node) => {
    console.log("Refreshing node:", node.name);
    // Force children to be refetched by setting to null first, then toggle
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, node.id, { children: null })
    );
    await fetchNodeChildren(node);

    setOpenNodes((prev) => ({
      ...prev,
      [node.id]: true, // Ensure node stays open after refresh
    }));
  };

  const handleAddNode = (node) => {
    console.log("Add action on node:", node.name);
    alert(
      `触发了“新增”操作，目标节点: ${node.name}\n\n您可以在这里实现具体的业务逻辑。`
    );
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
                  onAdd={handleAddNode}
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
        connections={connections} // 传递 connections
        treeData={treeData} // 传递 treeData
      />
    </div>
  );
}

export default DatabaseViewer;
