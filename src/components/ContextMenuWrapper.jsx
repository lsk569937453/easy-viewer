// components/ContextMenuWrapper.js
import React, { useState, useEffect, useRef } from "react";

/**
 * @param {React.ReactNode} children - The element that will trigger the context menu.
 * @param {Array<{label: string, onClick: function}>} menuItems - The items to display in the menu.
 */
function ContextMenuWrapper({ children, menuItems }) {
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const menuRef = useRef(null);

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleClose = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  // 点击菜单外部时关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        handleClose();
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
    <div className="w-full" onContextMenu={handleContextMenu}>
      {children}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 50, // 确保在顶层
          }}
        >
          {/* 这里就是 daisyUI 的 Menu 组件 */}
          <ul className="menu bg-base-200 w-56 rounded-box shadow-lg">
            {menuItems.map((item, index) => (
              <li key={index}>
                <a onClick={() => {
                  item.onClick();
                  handleClose();
                }}>
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