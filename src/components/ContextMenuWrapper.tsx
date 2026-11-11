// components/ContextMenuWrapper.ts
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

interface ContextMenuWrapperProps {
  children: ReactNode;
  menuItems: ContextMenuItem[];
  onClick?: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

/**
 * 右键菜单容器：点击菜单外部时关闭。
 */
function ContextMenuWrapper({
  children,
  menuItems,
  onClick,
}: ContextMenuWrapperProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleClose = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // 点击菜单外部时关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.visible]);

  // 菜单打开后聚焦第一项，保证键盘可操作
  useEffect(() => {
    if (!contextMenu.visible) return;
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(
      "[role='menuitem']",
    );
    firstItem?.focus();
  }, [contextMenu.visible]);

  // Esc 关闭，上下键在菜单项间移动
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ??
        [],
    );
    const activeIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        activeIndex < 0
          ? 0
          : (activeIndex + step + items.length) % items.length;
      items[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="presentation"
      className="w-full"
      onContextMenu={handleContextMenu}
      onClick={onClick}
    >
      {children}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          style={{
            position: "fixed",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 50, // 确保在顶层
          }}
        >
          {/* 这里就是 daisyUI 的 Menu 组件 */}
          <ul role="none" className="menu bg-base-200 w-56 rounded-box shadow-lg">
            {menuItems.map((item, index) => (
              <li key={`${item.label}-${index}`} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick();
                    handleClose();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ContextMenuWrapper;
