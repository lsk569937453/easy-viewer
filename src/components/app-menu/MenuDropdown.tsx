import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

export const TITLEBAR_TRIGGER_CLASS =
  "dropdown-toggle flex-shrink-0 rounded-[var(--radius-control)] px-2.5 py-1 text-[13px] font-medium text-base-content/70 transition-colors hover:bg-hover hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export const MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-2 rounded-[4px] px-2.5 py-1.5 text-left text-[13px]";

interface MenuDropdownProps {
  label: string;
  children: ReactNode;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  panelClassName?: string;
}

/** 标题栏菜单触发器 + 下拉面板（4 个菜单共用，避免复制粘贴） */
function MenuDropdown({
  label,
  children,
  onKeyDown,
  panelClassName = "w-52",
}: MenuDropdownProps) {
  return (
    <li>
      <div className="dropdown dropdown-hover">
        <button
          type="button"
          className={TITLEBAR_TRIGGER_CLASS}
          aria-haspopup="menu"
          data-tauri-no-drag
          onKeyDown={onKeyDown}
        >
          {label}
        </button>
        <ul
          className={`app-panel dropdown-content z-[20] menu p-1 text-[13px] ${panelClassName}`}
        >
          {children}
        </ul>
      </div>
    </li>
  );
}

export default MenuDropdown;
