import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaTimes } from "react-icons/fa";
import type { ConnectionSummary } from "../types/backend";
import type { SetActiveTabId, SetTabs, Tab } from "../types/tab";
import type { TreeNode } from "../types/tree";
import ColumnDetailPage from "./ColumnDetailPage";
import ElasticsearchIndexPanel from "./ElasticsearchIndexPanel";
import IndexDetailPage from "./IndexDetailPage";
import KafkaMessagesPanel from "./KafkaMessagesPanel";
import KafkaTopicDetail from "./KafkaTopicDetail";
import RedisConsolePanel from "./RedisConsolePanel";
import RedisKeyDetailPanel from "./RedisKeyDetailPanel";
import RocketmqMessagesPanel from "./RocketmqMessagesPanel";
import S3ObjectPanel from "./S3ObjectPanel";
import S3UploadPanel from "./S3UploadPanel";
import SqlEditorTabContent from "./SqlEditorTabContent";
import TableDetailPage from "./TableDetailPage";
import TableWorkspacePanel from "./TableWorkspacePanel";

interface TabPanelProps {
  tabs: Tab[];
  setTabs: SetTabs;
  activeTabId: string | null;
  setActiveTabId: SetActiveTabId;
  connections: ConnectionSummary[];
  treeData: TreeNode[];
  onQuerySaved?: (queryId: string, newName: string) => void;
  onRedisKeyDeleted?: (node: TreeNode) => void;
}

function TabPanel({
  tabs,
  setTabs,
  activeTabId,
  setActiveTabId,
  connections,
  onQuerySaved,
  onRedisKeyDeleted,
}: TabPanelProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  const tabPanelContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 菜单打开后聚焦第一项，Esc 关闭，保证键盘可用
  useEffect(() => {
    if (!menuVisible) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[role='menuitem']")
      ?.focus();
  }, [menuVisible]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuVisible(false);
    }
  };

  const handleContextMenu = (
    e: ReactMouseEvent<HTMLDivElement>,
    tabId: string,
  ) => {
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

  const handleCloseTab = (tabId: string) => {
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

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // 标签栏键盘导航：←/→ 循环移动焦点并激活对应标签页
  const handleTabListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const tabElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
    );
    if (tabElements.length === 0) return;

    event.preventDefault();
    const currentIndex = tabElements.indexOf(
      document.activeElement as HTMLElement,
    );
    const step = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + step + tabElements.length) % tabElements.length;
    const nextTab = tabElements[nextIndex];
    const nextTabId = nextTab?.dataset.tabId;
    nextTab?.focus();
    if (nextTabId) setActiveTabId(nextTabId);
  };

  return (
    <div
      ref={tabPanelContainerRef}
      className="flex flex-col overflow-hidden rounded-md bg-base-100 border border-base-content/5 relative"
    >
      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div
          role="tablist"
          aria-label="打开的标签页"
          onKeyDown={handleTabListKeyDown}
          className="flex border-b border-base-content/5 bg-base-200/50 w-full overflow-x-auto"
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="tab"
              aria-selected={activeTabId === tab.id}
              tabIndex={activeTabId === tab.id ? 0 : -1}
              data-tab-id={tab.id}
              className={`
                flex items-center px-3 py-1.5 cursor-pointer border-r border-base-content/5
                flex-1 min-w-[60px] max-w-[220px] transition-colors
                ${
                  activeTabId === tab.id
                    ? "bg-base-100 text-primary font-semibold"
                    : "text-base-content/50 hover:bg-base-200 hover:text-base-content/80"
                }
              `}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTabClick(tab.id);
                }
              }}
            >
              <span
                className="mr-1.5 flex-shrink-0 opacity-60"
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span className="truncate flex-grow text-xs">{tab.name}</span>
              <button
                type="button"
                aria-label={`关闭 ${tab.name} 标签页`}
                className="ml-1 flex-shrink-0 rounded text-base-content/40 hover:text-error transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
              >
                <FaTimes size="0.7em" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain">
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
                  setActiveTabId={setActiveTabId}
                  onQuerySaved={onQuerySaved}
                />
              );
            }

            // Render TableDetailPage for "tableDetail" type tabs
            if (activeTab.type === "tableDetail") {
              const activeNode = activeTab.node; // Use the node data we stored in the tab
              const rootConfigId = activeNode.path[0].config_value;
              const connection = connections.find(
                (conn) => conn.base_config_id.toString() === rootConfigId,
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

            // Render KafkaMessagesPanel for "kafkaMessages" type tabs
            if (activeTab.type === "kafkaMessages") {
              return (
                <KafkaMessagesPanel
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                />
              );
            }

            // Render KafkaTopicDetail for "kafkaTopicDetail" type tabs
            if (activeTab.type === "kafkaTopicDetail") {
              return (
                <KafkaTopicDetail
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                />
              );
            }

            // Render RocketmqMessagesPanel for "rocketmqMessages" type tabs
            if (activeTab.type === "rocketmqMessages") {
              return (
                <RocketmqMessagesPanel
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                />
              );
            }

            // Render RedisConsolePanel for "redisConsole" type tabs
            if (activeTab.type === "redisConsole") {
              return (
                <RedisConsolePanel
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                />
              );
            }

            // Render RedisKeyDetailPanel for "redisKeyDetail" type tabs
            if (activeTab.type === "redisKeyDetail") {
              return (
                <RedisKeyDetailPanel
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                  onKeyDeleted={onRedisKeyDeleted}
                />
              );
            }

            // Render ElasticsearchIndexPanel for "esIndexBrowser" type tabs
            if (activeTab.type === "esIndexBrowser") {
              return (
                <ElasticsearchIndexPanel
                  activeTabNode={activeTab.node}
                  connectionDetails={activeTab.connectionDetails}
                />
              );
            }

            // Render S3UploadPanel for "s3Upload" type tabs
            if (activeTab.type === "s3Upload") {
              return <S3UploadPanel tab={activeTab} />;
            }

            // Render S3ObjectPanel for "s3Object" type tabs
            if (activeTab.type === "s3Object") {
              return <S3ObjectPanel tab={activeTab} />;
            }

            // Default rendering for other tab types (e.g., info tabs for database/schema nodes)
            // Note: For 'sqlEditor' tabs, activeTabId might not directly correspond to a treeData node ID.
            // This 'findNodeInTree' part is for generic info tabs that do correspond to tree nodes.
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
            <div className="text-center text-base-content/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              <p className="mt-3 text-sm">从左侧选择节点以查看内容</p>
            </div>
          </div>
        )}
      </div>
      {/* Context Menu */}
      {menuVisible && (
        <div
          ref={(el) => {
            menuRef.current = el;
            if (el && tabPanelContainerRef.current) {
              const containerRect =
                tabPanelContainerRef.current.getBoundingClientRect();
              const menuRect = el.getBoundingClientRect();
              // 如果菜单超出容器右边界，改为右对齐
              if (menuRect.right > containerRect.right) {
                el.style.left = "auto";
                el.style.right = `${containerRect.right - containerRect.left - menuPosition.x - 1}px`;
              }
            }
          }}
          role="menu"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="absolute z-50 bg-base-100 shadow-lg rounded-md p-2 min-w-[160px]"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <ul className="menu menu-compact">
            <li>
              <button type="button" role="menuitem" onClick={handleCloseLeft}>
                关闭左侧标签页
              </button>
            </li>
            <li>
              <button type="button" role="menuitem" onClick={handleCloseRight}>
                关闭右侧标签页
              </button>
            </li>
            <li>
              <button type="button" role="menuitem" onClick={handleCloseAll}>
                关闭所有标签页
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default TabPanel;
