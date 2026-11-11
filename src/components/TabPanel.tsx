import type { ConnectionSummary } from "../types/backend";
import type { SetActiveTabId, SetTabs, Tab } from "../types/tab";
import type { TreeNode } from "../types/tree";
import TabBar from "./tab-panel/TabBar";
import TabContextMenu from "./tab-panel/TabContextMenu";
import {
  renderTabContent,
  type TabContentContext,
} from "./tab-panel/tabContentRegistry";
import { useTabContextMenu } from "./tab-panel/useTabContextMenu";
import StatusChip from "./ui/StatusChip";

interface TabPanelProps {
  tabs: Tab[];
  setTabs: SetTabs;
  activeTabId: string | null;
  setActiveTabId: SetActiveTabId;
  connections: ConnectionSummary[];
  treeData: TreeNode[];
  onQuerySaved?: (queryId: string, newName: string) => void;
  onRedisKeyDeleted?: (node: TreeNode) => void;
  onKafkaTopicDeleted?: (node: TreeNode) => void;
}

/**
 * 标签页容器：标签条 + 按类型分发的内容区 + 右键菜单。
 * 内容组件映射见 `tab-panel/tabContentRegistry`，菜单状态见 `useTabContextMenu`。
 */
function TabPanel({
  tabs,
  setTabs,
  activeTabId,
  setActiveTabId,
  connections,
  onQuerySaved,
  onRedisKeyDeleted,
  onKafkaTopicDeleted,
}: TabPanelProps) {
  const {
    containerRef,
    menuRef,
    menuVisible,
    menuPosition,
    handleContextMenu,
    handleMenuKeyDown,
    handleCloseLeft,
    handleCloseRight,
    handleCloseAll,
  } = useTabContextMenu({ tabs, activeTabId, setTabs, setActiveTabId });

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

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const contentContext: TabContentContext = {
    connections,
    setTabs,
    setActiveTabId,
    onQuerySaved,
    onRedisKeyDeleted,
    onKafkaTopicDeleted,
  };

  return (
    <div
      ref={containerRef}
      className="app-panel relative flex min-h-0 flex-col overflow-hidden"
    >
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleCloseTab}
        onContextMenu={handleContextMenu}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-base-100">
        {activeTabId && tabs.length > 0 ? (
          (() => {
            const activeTab = tabs.find((tab) => tab.id === activeTabId);
            if (!activeTab) return null;
            return renderTabContent(activeTab, contentContext);
          })()
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <span
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-[11px] font-bold leading-none text-primary-content"
                aria-hidden="true"
              >
                DB
              </span>
              <p className="mt-3 text-[13px] font-medium text-base-content/70">
                选择左侧的节点开始浏览
              </p>
              <p className="mt-1 text-micro leading-relaxed text-base-content/45">
                表结构与数据、SQL
                编辑器、消息与对象存储详情都会在这里以标签页打开。
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                <StatusChip>数据库</StatusChip>
                <StatusChip>消息队列</StatusChip>
                <StatusChip>对象存储</StatusChip>
              </div>
            </div>
          </div>
        )}
      </div>
      <TabContextMenu
        visible={menuVisible}
        position={menuPosition}
        containerRef={containerRef}
        menuRef={menuRef}
        onKeyDown={handleMenuKeyDown}
        onCloseLeft={handleCloseLeft}
        onCloseRight={handleCloseRight}
        onCloseAll={handleCloseAll}
      />
    </div>
  );
}

export default TabPanel;
