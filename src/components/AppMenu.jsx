// src/components/AppMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import AboutModal from "./AboutModal";
import NewConnectionModal from "./NewConnectionModal"; // 导入 NewConnectionModal 组件

const appWindow = getCurrentWindow();

// 定义一个可选的主题列表
const themes = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
];

function AppMenu({ onConnectionCreated }) {
  const menuRef = useRef(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false); // 控制“新建连接”模态框的显示状态
  
  // 新增: 使用 state 来管理当前主题
  // 尝试从 localStorage 读取已保存的主题，如果没有则默认为 'light'
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // 新增: 使用 useEffect 来应用主题变化
  // 当 theme state 发生变化时，会执行此 effect
  useEffect(() => {
    // 1. 将主题设置到 <html> 元素的 data-theme 属性上
    document.documentElement.setAttribute("data-theme", theme);
    // 2. 将当前主题保存到 localStorage，以便下次打开应用时保持一致
    localStorage.setItem("theme", theme);
  }, [theme]); // 依赖数组中放入 theme，表示仅在 theme 变化时执行

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
  
  // 新增: 处理主题切换的函数
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme); // 更新主题 state
    handleItemClick(); // 关闭下拉菜单
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

      if (!openDropdowns || openDropdowns.length === 0) {
        console.log("没有打开的下拉菜单。");
        return;
      }

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

      if (!menuRef.current.contains(event.target)) {
        console.log("点击发生在整个菜单栏外部，确保所有下拉菜单关闭。");
        openDropdowns.forEach((dropdown) => {
          dropdown.classList.remove("dropdown-open");
          console.log("最终关闭了下拉菜单:", dropdown);
        });
      } else if (clickedInsideAnyDropdown) {
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
          {/* 连接菜单 */}
          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                连接
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li onClick={handleNewConnectionClick}>
                  <a>新建连接...</a>
                </li>
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

          {/* -- 修改开始: 将“编辑”菜单替换为“主题”菜单 -- */}
          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                主题
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-56 max-h-96 overflow-y-auto"
              >
                {themes.map((themeName) => (
                  <li
                    key={themeName}
                    onClick={() => handleThemeChange(themeName)}
                  >
                    <a className={theme === themeName ? "active" : ""}>
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
          {/* -- 修改结束 -- */}

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
        <button
          className="btn btn-square btn-ghost"
          onClick={() => appWindow.minimize()}
        >
          _
        </button>
        <button
          className="btn btn-square btn-ghost"
          onClick={() => appWindow.toggleMaximize()}
        >
          □
        </button>
        <button
          className="btn btn-square btn-ghost"
          onClick={() => appWindow.close()}
        >
          ✕
        </button>
      </div>

      <AboutModal isOpen={showAboutModal} onClose={handleCloseAboutModal} />

      <NewConnectionModal
        isOpen={showNewConnectionModal}
        onClose={handleCloseNewConnectionModal}
        onCreationSuccess={onConnectionCreated}
      />
    </div>
  );
}

export default AppMenu;