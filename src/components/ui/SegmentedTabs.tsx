import type { ReactNode } from "react";

export interface SegmentedTabItem<TId extends string = string> {
  id: TId;
  label: ReactNode;
}

export interface SegmentedTabsProps<TId extends string = string> {
  items: readonly SegmentedTabItem<TId>[];
  activeId: TId;
  onChange: (id: TId) => void;
  /** 容器附加类，例如表工作区的 `bg-base-200/40` */
  className?: string;
  ariaLabel?: string;
}

const CONTAINER_CLASS =
  "flex h-9 flex-shrink-0 items-stretch border-b border-hairline px-1";
const TAB_CLASS = "-mb-px border-b-2 px-3 text-xs transition-colors";
const TAB_ACTIVE_CLASS = "border-primary font-medium text-base-content";
const TAB_INACTIVE_CLASS =
  "border-transparent text-base-content/55 hover:text-base-content/85";

/**
 * 分段标签条（原 5 个面板各写一遍，只有 items 内容与容器背景不同）。
 * 语义与样式与拆分前逐字一致：role=tablist / role=tab / aria-selected。
 */
function SegmentedTabs<TId extends string = string>({
  items,
  activeId,
  onChange,
  className,
  ariaLabel,
}: SegmentedTabsProps<TId>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={
        className ? `${CONTAINER_CLASS} ${className}` : CONTAINER_CLASS
      }
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={`${TAB_CLASS} ${
            activeId === item.id ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS
          }`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedTabs;
