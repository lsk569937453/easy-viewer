// components/ContextMenuWrapper.ts
import {
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

  return (
    <div className="w-full" onContextMenu={handleContextMenu} onClick={onClick}>
      {children}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 50, // 确保在顶层
          }}
        >
          {/* 这里就是 daisyUI 的 Menu 组件 */}
          <ul className="menu bg-base-200 w-56 rounded-box shadow-lg">
            {menuItems.map((item, index) => (
              <li key={index}>
                <a
                  onClick={() => {
                    item.onClick();
                    handleClose();
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ContextMenuWrapper;
