import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { FaTimes } from "react-icons/fa";
import type { Tab } from "../../types/tab";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    tabId: string,
  ) => void;
}

/** 标签条：role=tablist + 每项 role=tab，支持 ←/→ 循环切换与关闭按钮。 */
function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onContextMenu,
}: TabBarProps) {
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
    if (nextTabId) onTabClick(nextTabId);
  };

  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="打开的标签页"
      onKeyDown={handleTabListKeyDown}
      className="flex w-full flex-shrink-0 items-stretch overflow-x-auto border-b border-hairline bg-base-200/40"
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={activeTabId === tab.id}
          tabIndex={activeTabId === tab.id ? 0 : -1}
          data-tab-id={tab.id}
          className={[
            "group flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-r border-hairline px-2.5 transition-colors",
            "min-w-[96px] max-w-[200px]",
            activeTabId === tab.id
              ? "bg-base-100 font-medium text-base-content shadow-[inset_0_2px_0_0_var(--color-primary)]"
              : "text-base-content/55 hover:bg-hover hover:text-base-content/85",
          ].join(" ")}
          onClick={() => onTabClick(tab.id)}
          onContextMenu={(e) => onContextMenu(e, tab.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTabClick(tab.id);
            }
          }}
        >
          <span
            className="flex-shrink-0 text-[13px] opacity-70"
            aria-hidden="true"
          >
            {tab.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs">{tab.name}</span>
          <button
            type="button"
            aria-label={`关闭 ${tab.name} 标签页`}
            className={`app-icon-btn ml-0.5 h-5 w-5 hover:text-error ${
              activeTabId === tab.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
          >
            <FaTimes size="0.7em" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default TabBar;
