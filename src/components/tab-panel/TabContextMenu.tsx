import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

interface TabMenuPosition {
  x: number;
  y: number;
}

interface TabContextMenuProps {
  visible: boolean;
  position: TabMenuPosition;
  containerRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onCloseLeft: () => void;
  onCloseRight: () => void;
  onCloseAll: () => void;
}

/** 标签页右键菜单面板：超出容器右边界时自动改为右对齐。 */
function TabContextMenu({
  visible,
  position,
  containerRef,
  menuRef,
  onKeyDown,
  onCloseLeft,
  onCloseRight,
  onCloseAll,
}: TabContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      ref={(el) => {
        menuRef.current = el;
        if (el && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const menuRect = el.getBoundingClientRect();
          // 如果菜单超出容器右边界，改为右对齐
          if (menuRect.right > containerRect.right) {
            el.style.left = "auto";
            el.style.right = `${containerRect.right - containerRect.left - position.x - 1}px`;
          }
        }
      }}
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="app-context-menu absolute z-50 min-w-[160px]"
      style={{ top: position.y, left: position.x }}
    >
      <ul className="menu w-full p-0">
        <li>
          <button type="button" role="menuitem" onClick={onCloseLeft}>
            关闭左侧标签页
          </button>
        </li>
        <li>
          <button type="button" role="menuitem" onClick={onCloseRight}>
            关闭右侧标签页
          </button>
        </li>
        <li>
          <button type="button" role="menuitem" onClick={onCloseAll}>
            关闭所有标签页
          </button>
        </li>
      </ul>
    </div>
  );
}

export default TabContextMenu;
