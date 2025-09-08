import React, { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

function AppMenu() {
  const menuRef = useRef(null);

  const handleItemClick = () => {
    console.log("菜单项被点击了。", { timestamp: new Date().toISOString() });

    // 当一个菜单项被点击时，关闭所有打开的下拉菜单
    const openDropdowns = menuRef.current?.querySelectorAll(
      ".dropdown.dropdown-open"
    );
    openDropdowns?.forEach((dropdown) =>
      dropdown.classList.remove("dropdown-open")
    );

    // 确保点击后焦点移开
    if (document.activeElement) {
      document.activeElement.blur();
      console.log("失去焦点的元素：", document.activeElement);
    }
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

      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
          {/* 文件菜单 */}
          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4"
                data-tauri-no-drag
              >
                文件
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li onClick={handleItemClick}>
                  <a>新建项目</a>
                </li>
                <li onClick={handleItemClick}>
                  <a>打开项目...</a>
                </li>
                {/* 修改此处：使用自定义的 1px 高度半透明分隔线 */}
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>退出</a>
                </li>
              </ul>
            </div>
          </li>

          {/* 编辑菜单 */}
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
                {/* 修改此处 */}
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>剪切</a>
                </li>
                <li onClick={handleItemClick}>
                  <a>复制</a>
                </li>
                {/* 修改此处 */}
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li onClick={handleItemClick}>
                  <a>粘贴</a>
                </li>
              </ul>
            </div>
          </li>

          {/* 视图菜单 */}
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

          {/* 帮助菜单 */}
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
                <li onClick={handleItemClick}>
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

      {/* 窗口控制按钮，设置为不可拖拽 */}
      <div className="flex-none" data-tauri-no-drag>
        <button className="btn btn-square btn-ghost">_</button>
        <button className="btn btn-square btn-ghost">□</button>
        <button className="btn btn-square btn-ghost">✕</button>
      </div>
    </div>
  );
}

export default AppMenu;
