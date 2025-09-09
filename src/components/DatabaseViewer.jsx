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

const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  table: <FaTable />,
  view: <FaEye />,
  query: <FaSearch />,
  tables: <FaColumns />,
  views: <FaEye />,
  singletable: <FaTable />,
  partitions: <FaLayerGroup />,
  columns: <FaColumns />,
  index: <FaKey />,
  column: <FaStream />,
  primary: <FaStar />,
  default: <FaFolder />,
};

const getNodeIcon = (nodeType, iconName) => {
  const key = iconName?.toLowerCase() || nodeType?.toLowerCase() || "default";
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

function TabPanel({ tabs, setTabs, activeTabId, setActiveTabId }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTabId, setSelectedTabId] = useState(null);

  const tabPanelContainerRef = useRef(null); // 2. 创建一个 ref

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
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTabId && tabs.length > 0 ? (
          (() => {
            const activeTab = tabs.find((tab) => tab.id === activeTabId);
            return activeTab ? (
              <div>
                <h1 className="text-3xl font-bold mb-4 text-primary flex items-center">
                  {activeTab.icon && (
                    <span className="mr-3">{activeTab.icon}</span>
                  )}
                  {activeTab.name}
                </h1>
                <div className="divider"></div>
                <p className="text-base-content/80 whitespace-pre-wrap">
                  {activeTab.details || "暂无详细描述。"}
                </p>
              </div>
            ) : null;
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
        details: `ID: ${conn.base_config_id}\n类型: ${dbType.toUpperCase()}`,
        children: null,
        path: [{ level: 1, config_value: conn.base_config_id.toString() }],
      };
    });
    setTreeData(newTreeData);
  }, [connections]);

  const handleNodeActivate = (node) => {
    const existingTab = tabs.find((tab) => tab.id === node.id);
    if (existingTab) {
      setActiveTabId(node.id);
    } else {
      const newTab = {
        id: node.id,
        name: node.name,
        icon: node.icon,
        details: node.details,
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
          details: `Details for ${child.name}`,
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
    await fetchNodeChildren(node);

    setOpenNodes((prev) => ({
      ...prev,
      [node.id]: true,
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
      />
    </div>
  );
}

export default DatabaseViewer;
