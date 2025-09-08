// src/components/AppMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import AboutModal from "./AboutModal";
import NewConnectionModal from "./NewConnectionModal"; // 导入 NewConnectionModal 组件

const appWindow = getCurrentWindow();

function AppMenu() {
  const menuRef = useRef(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false); // 控制“新建连接”模态框的显示状态

  const handleItemClick = () => {
    console.log("菜单项被点击了。", { timestamp: new Date().toISOString() });

    const openDropdowns = menuRef.current?.querySelectorAll(
      ".dropdown.dropdown-open"
    );
    openDropdowns?.forEach((dropdown) =>
      dropdown.classList.remove("dropdown-open")
    );

    if (document.activeElement) {
      document.activeElement.blur();
      console.log("失去焦点的元素：", document.activeElement);
    }
  };

  // 处理“关于”菜单项点击事件
  const handleAboutClick = () => {
    handleItemClick(); // 先执行通用的点击处理，如关闭下拉菜单
    setShowAboutModal(true); // 打开“关于”模态框
  };

  // 关闭“关于”模态框的回调
  const handleCloseAboutModal = () => {
    setShowAboutModal(false);
  };

  // 处理“新建连接”菜单项点击事件
  const handleNewConnectionClick = () => {
    handleItemClick(); // 先执行通用的点击处理，如关闭下拉菜单
    setShowNewConnectionModal(true); // 打开“新建连接”模态框
  };

  // 关闭“新建连接”模态框的回调
  const handleCloseNewConnectionModal = () => {
    setShowNewConnectionModal(false);
  };

  // 处理创建连接的逻辑（从 NewConnectionModal 传入）
  const handleCreateConnection = ({ dbType, connectionString }) => {
    // 实际的连接创建逻辑将在这里处理
    console.log(`成功创建连接：类型 - ${dbType}, 字符串 - ${connectionString}`);
    // 可以在这里触发全局状态更新，将新连接添加到数据库导航树中
    alert(`连接创建成功！\n类型: ${dbType}\n字符串: ${connectionString}`);
  };

  useEffect(() => {
    console.log("AppMenu useEffect 挂载或更新。", {
      timestamp: new Date().toISOString(),
    });
    const appMenuTitlebar = menuRef.current;

    const handleMouseDown = (e) => {
      console.log("--- handleMouseDown 事件触发 ---", {
        timestamp: new Date().toISOString(),
      });
      console.log("点击目标 (e.target):", e.target);
      console.log("鼠标按钮 (e.buttons):", e.buttons);
      console.log("点击次数 (e.detail):", e.detail);

      const isNoDragElement = e.target.closest(
        "[data-tauri-no-drag], A, BUTTON, SUMMARY, INPUT, SELECT, TEXTAREA, .dropdown-toggle"
      );

      console.log(
        "是否是不可拖拽/交互式元素 (isNoDragElement):",
        isNoDragElement
      );
      if (isNoDragElement) {
        console.log("点击在不可拖拽或交互式元素上，跳过拖拽逻辑。", {
          element: isNoDragElement,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (e.buttons === 1) {
        console.log("鼠标左键点击，将调用 e.preventDefault()。", {
          timestamp: new Date().toISOString(),
        });
        e.preventDefault(); // 阻止默认的文本选择等行为

        if (e.detail === 2) {
          console.log("双击检测到，调用 appWindow.toggleMaximize()。", {
            timestamp: new Date().toISOString(),
          });
          appWindow.toggleMaximize();
        } else {
          console.log("单击检测到，调用 appWindow.startDragging()。", {
            timestamp: new Date().toISOString(),
          });
          appWindow.startDragging();
        }
      } else {
        console.log("非鼠标左键点击，不执行拖拽逻辑。", {
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleDocumentClick = (event) => {
      console.log("--- handleDocumentClick 事件触发 ---", {
        timestamp: new Date().toISOString(),
      });
      console.log("document 点击目标 (event.target):", event.target);

      const clickedInsideAnyDropdown = event.target.closest(".dropdown");
      const openDropdowns = menuRef.current?.querySelectorAll(
        ".dropdown.dropdown-open"
      );

      // 如果没有打开的下拉菜单，直接返回
      if (!openDropdowns || openDropdowns.length === 0) {
        console.log("没有打开的下拉菜单。");
        return;
      }

      // 检查点击是否发生在模态框内部（关于模态框或新建连接模态框）
      const clickedInsideAboutModal = event.target.closest(
        "#about_modal .modal-box"
      );
      const clickedInsideNewConnectionModal = event.target.closest(
        "#new_connection_modal .modal-box"
      );

      if (clickedInsideAboutModal || clickedInsideNewConnectionModal) {
        console.log("点击发生在模态框内部，不关闭下拉菜单。");
        return;
      }

      // 如果点击发生在整个菜单栏外部，则关闭所有打开的下拉菜单
      if (!menuRef.current.contains(event.target)) {
        console.log("点击发生在整个菜单栏外部，确保所有下拉菜单关闭。");
        openDropdowns.forEach((dropdown) => {
          dropdown.classList.remove("dropdown-open");
          console.log("最终关闭了下拉菜单:", dropdown);
        });
      } else if (clickedInsideAnyDropdown) {
        // 如果点击在某个下拉菜单内部，关闭其他打开的下拉菜单
        const clickedDropdown = clickedInsideAnyDropdown;
        openDropdowns.forEach((dropdown) => {
          if (dropdown !== clickedDropdown) {
            dropdown.classList.remove("dropdown-open");
            console.log("关闭了其他下拉菜单:", dropdown);
          }
        });
      } else {
        console.log(
          "点击发生在菜单内部但不在任何特定下拉菜单内部或其触发器上。"
        );
      }
    };

    if (appMenuTitlebar) {
      appMenuTitlebar.addEventListener("mousedown", handleMouseDown);
      console.log("mousedown 事件监听器已添加到 appMenuTitlebar。", {
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error(
        "appMenuTitlebar (menuRef.current) 为空，无法添加 mousedown监听器！",
        { timestamp: new Date().toISOString() }
      );
    }
    document.addEventListener("click", handleDocumentClick);
    console.log("document click 事件监听器已添加。", {
      timestamp: new Date().toISOString(),
    });

    return () => {
      console.log("AppMenu useEffect 清理函数运行。", {
        timestamp: new Date().toISOString(),
      });
      if (appMenuTitlebar) {
        appMenuTitlebar.removeEventListener("mousedown", handleMouseDown);
        console.log("mousedown 事件监听器已从 appMenuTitlebar 移除。", {
          timestamp: new Date().toISOString(),
        });
      }
      document.removeEventListener("click", handleDocumentClick);
      console.log("document click 事件监听器已移除。", {
        timestamp: new Date().toISOString(),
      });
    };
  }, []);

  return (
    <div
      id="app-menu-titlebar"
      className="navbar h-12 min-h-12 max-h-12 select-none rounded-t-lg bg-base-200"
      ref={menuRef}
      style={{ position: "relative", zIndex: 10 }}
    >
      <div className="flex-1 flex items-center">
        <a className="btn btn-ghost text-xl normal-case" data-tauri-no-drag>
          DB Viewer
        </a>
        <ul className="menu menu-horizontal p-0" data-tauri-no-drag>
          {/* 连接菜单 (原“文件”菜单) */}
          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                连接 {/* 菜单名已更改 */}
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                {/* 新增“新建连接...”菜单项 */}
                <li onClick={handleNewConnectionClick}>
                  <a>新建连接...</a>
                </li>
                {/* 其他文件相关的菜单项如果需要可以重新添加，或者直接移除 */}
                <li onClick={handleItemClick}>
                  <a>打开连接...</a>
                </li>
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>断开所有连接</a>
                </li>
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>退出</a>
                </li>
              </ul>
            </div>
          </li>

          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                编辑
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li onClick={handleItemClick}>
                  <a>撤销</a>
                </li>
                <li onClick={handleItemClick}>
                  <a>重做</a>
                </li>
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>剪切</a>
                </li>
                <li onClick={handleItemClick}>
                  <a>复制</a>
                </li>
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>粘贴</a>
                </li>
              </ul>
            </div>
          </li>

          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                视图
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li onClick={handleItemClick}>
                  <a>刷新</a>
                </li>
                <li onClick={handleItemClick}>
                  <a>全屏</a>
                </li>
              </ul>
            </div>
          </li>

          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                帮助
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li onClick={handleAboutClick}>
                  <a>关于</a>
                </li>
                <li onClick={handleItemClick}>
                  <a>检查更新...</a>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>

      <div className="flex-none" data-tauri-no-drag>
        {/* 最小化按钮 */}
        <button
          className="btn btn-square btn-ghost"
          onClick={() => appWindow.minimize()}
        >
          _
        </button>
        {/* 最大化/恢复按钮 */}
        <button
          className="btn btn-square btn-ghost"
          onClick={() => appWindow.toggleMaximize()}
        >
          □
        </button>
        {/* 关闭按钮 */}
        <button
          className="btn btn-square btn-ghost"
          onClick={() => appWindow.close()}
        >
          ✕
        </button>
      </div>

      {/* 渲染 AboutModal 组件 */}
      <AboutModal isOpen={showAboutModal} onClose={handleCloseAboutModal} />

      {/* 渲染 NewConnectionModal 组件 */}
      <NewConnectionModal
        isOpen={showNewConnectionModal}
        onClose={handleCloseNewConnectionModal}
        onCreateConnection={handleCreateConnection}
      />
    </div>
  );
}

export default AppMenu;
