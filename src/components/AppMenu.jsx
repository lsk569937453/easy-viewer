// src/components/AppMenu.jsx

import React, { useEffect, useRef } from 'react';

function AppMenu() {
  const menuRef = useRef(null);

  // 点击菜单项后关闭 dropdown
  const handleItemClick = () => {
    const activeElement = document.activeElement;
    if (activeElement) {
      activeElement.blur();
    }
  };

  // 使用 useEffect 来处理点击外部关闭菜单的逻辑
  useEffect(() => {
    const handleDocumentClick = (event) => {
      // 如果菜单存在且点击事件发生在菜单外部
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        // 找到当前打开的 dropdown 并关闭它
        const openDropdown = menuRef.current.querySelector('details[open]');
        if (openDropdown) {
          openDropdown.removeAttribute('open');
        }
      }
    };
    
    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);


  return (
    // data-tauri-drag-region 允许我们拖动窗口
    <div data-tauri-drag-region className="navbar h-12 min-h-12 max-h-12 select-none overflow-hidden rounded-t-lg bg-base-200" ref={menuRef}>
      <div className="flex-1">
        {/* Logo or App Name */}
        <a className="btn btn-ghost text-xl normal-case">DB Viewer</a>

        {/* Menu Items */}
        <ul className="menu menu-horizontal p-0">
          {/* File Menu */}
          <li>
            <details>
              <summary>文件</summary>
              <ul className="p-2 bg-base-100 rounded-t-none shadow">
                <li onClick={handleItemClick}><a>新建项目</a></li>
                <li onClick={handleItemClick}><a>打开项目...</a></li>
                <li className="divider my-0"></li>
                <li onClick={handleItemClick}><a>退出</a></li>
              </ul>
            </details>
          </li>

          {/* Edit Menu */}
          <li>
            <details>
              <summary>编辑</summary>
              <ul className="p-2 bg-base-100 rounded-t-none shadow">
                <li onClick={handleItemClick}><a>撤销</a></li>
                <li onClick={handleItemClick}><a>重做</a></li>
                <li className="divider my-0"></li>
                <li onClick={handleItemClick}><a>剪切</a></li>
                <li onClick={handleItemClick}><a>复制</a></li>
                <li onClick={handleItemClick}><a>粘贴</a></li>
              </ul>
            </details>
          </li>
          
          {/* View Menu */}
          <li>
            <details>
              <summary>视图</summary>
              <ul className="p-2 bg-base-100 rounded-t-none shadow">
                <li onClick={handleItemClick}><a>刷新</a></li>
                <li onClick={handleItemClick}><a>全屏</a></li>
              </ul>
            </details>
          </li>

          {/* Help Menu */}
          <li>
            <details>
              <summary>帮助</summary>
              <ul className="p-2 bg-base-100 rounded-t-none shadow">
                <li onClick={handleItemClick}><a>关于</a></li>
                <li onClick={handleItemClick}><a>检查更新...</a></li>
              </ul>
            </details>
          </li>
        </ul>
      </div>

      {/* Optional: Window Controls (Minimize, Maximize, Close) if you want to implement them manually */}
      {/* <div className="flex-none">
        <button className="btn btn-square btn-ghost">_</button>
        <button className="btn btn-square btn-ghost">□</button>
        <button className="btn btn-square btn-ghost">✕</button>
      </div> */}
    </div>
  );
}

export default AppMenu;