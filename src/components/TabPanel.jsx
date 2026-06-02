import React, { useState, useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";
import TableWorkspacePanel from "./TableWorkspacePanel.jsx";
import TableDetailPage from "./TableDetailPage.jsx";
import SqlEditorTabContent from "./SqlEditorTabContent.jsx";
import IndexDetailPage from "./IndexDetailPage.jsx";
import ColumnDetailPage from "./ColumnDetailPage.jsx";

const findNodeInTree = (nodes, nodeId) => {
  if (!Array.isArray(nodes)) {
    return null;
  }

  for (const node of nodes) {
    if (String(node.id) === String(nodeId)) {
      return node;
    }
    if (Array.isArray(node.children)) {
      const found = findNodeInTree(node.children, nodeId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

function TabPanel({
  tabs,
  setTabs,
  activeTabId,
  setActiveTabId,
  connections,
  treeData,
  onQuerySaved,
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

  return (
    <div
      ref={tabPanelContainerRef}
      className="flex flex-col overflow-hidden rounded-lg bg-base-100 shadow-lg relative"
    >
      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="flex border-b bg-base-200 w-full">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center px-3 py-2 cursor-pointer border-r border-base-300
                flex-1 min-w-[60px] max-w-[220px]
                ${
                  activeTabId === tab.id
                    ? "bg-base-100 text-primary font-semibold"
                    : "text-base-content/60 hover:bg-base-300"
                }
              `}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            >
              <span className="mr-1 flex-shrink-0">{tab.icon}</span>
              <span className="truncate flex-grow text-xs">{tab.name}</span>
              <button
                className="ml-1 flex-shrink-0 text-base-content/40 hover:text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
              >
                <FaTimes size="0.7em" />
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

            // Render SqlEditorTabContent for "sqlEditor" type tabs
            if (activeTab.type === "sqlEditor") {
              return (
                <SqlEditorTabContent
                  tab={activeTab} // Pass the entire tab object
                  connections={connections}
                  setTabs={setTabs}
                  onQuerySaved={onQuerySaved}
                />
              );
            }

            // Render TableDetailPage for "tableDetail" type tabs
            if (activeTab.type === "tableDetail") {
              const activeNode = activeTab.node; // Use the node data we stored in the tab
              const rootConfigId = activeNode.path[0].config_value;
              const connection = connections.find(
                (conn) => conn.base_config_id.toString() === rootConfigId
              );

              return (
                <TableDetailPage
                  activeTabNode={activeNode}
                  connectionDetails={connection}
                  defaultTab={activeTab.defaultTab}
                />
              );
            }
            // Render TableWorkspacePanel for "tableWorkspace" type tabs
            if (activeTab.type === "singleTable") {
              return (
                <TableWorkspacePanel
                  initialSql={activeTab.initialSql}
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                />
              );
            }

            // Render IndexDetailPage for "indexDetail" type tabs
            if (activeTab.type === "indexDetail") {
              return (
                <IndexDetailPage
                  activeTabNode={activeTab.node}
                  tableName={activeTab.tableName}
                />
              );
            }

            // Render ColumnDetailPage for "columnDetail" type tabs
            if (activeTab.type === "columnDetail") {
              return (
                <ColumnDetailPage
                  activeTabNode={activeTab.node}
                  tableName={activeTab.tableName}
                />
              );
            }

            // Default rendering for other tab types (e.g., info tabs for database/schema nodes)
            // Note: For 'sqlEditor' tabs, activeTabId might not directly correspond to a treeData node ID.
            // This 'findNodeInTree' part is for generic info tabs that do correspond to tree nodes.
            const activeNode = findNodeInTree(treeData, activeTabId);

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
          ref={(el) => {
            if (el && tabPanelContainerRef.current) {
              const containerRect = tabPanelContainerRef.current.getBoundingClientRect();
              const menuRect = el.getBoundingClientRect();
              // 如果菜单超出容器右边界，改为右对齐
              if (menuRect.right > containerRect.right) {
                el.style.left = "auto";
                el.style.right = `${containerRect.right - containerRect.left - menuPosition.x - 1}px`;
              }
            }
          }}
          className="absolute z-50 bg-base-100 shadow-lg rounded-md p-2 min-w-[160px]"
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

export default TabPanel;
