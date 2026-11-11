import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import AboutModal from "./AboutModal";
import NewConnectionModal from "./NewConnectionModal";

let appWindow: ReturnType<typeof getCurrentWindow> | null = null;
try {
  appWindow = getCurrentWindow();
} catch {
  console.warn("Not running in Tauri environment");
}

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

interface AppMenuProps {
  onConnectionCreated: () => void;
}

function AppMenu({ onConnectionCreated }: AppMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleItemClick = () => {
    const openDropdowns = menuRef.current?.querySelectorAll(
      ".dropdown.dropdown-open",
    );
    openDropdowns?.forEach((dropdown) => {
      dropdown.classList.remove("dropdown-open");
    });

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // 键盘展开/收起下拉菜单（hover 菜单对键盘用户不可达，这里补 Enter/Space 与 Esc）
  const handleDropdownKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const dropdown = event.currentTarget.closest(".dropdown");
    if (!dropdown) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dropdown.classList.toggle("dropdown-open");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      dropdown.classList.remove("dropdown-open");
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    handleItemClick();
  };

  const handleAboutClick = () => {
    handleItemClick();
    setShowAboutModal(true);
  };

  const handleCloseAboutModal = () => {
    setShowAboutModal(false);
  };

  const handleNewConnectionClick = () => {
    handleItemClick();
    setShowNewConnectionModal(true);
  };

  const handleCloseNewConnectionModal = () => {
    setShowNewConnectionModal(false);
  };

  useEffect(() => {
    const appMenuTitlebar = menuRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) {
        return;
      }
      const isNoDragElement = e.target.closest(
        "[data-tauri-no-drag], A, BUTTON, SUMMARY, INPUT, SELECT, TEXTAREA, .dropdown-toggle",
      );

      if (isNoDragElement) {
        return;
      }

      if (e.buttons === 1) {
        e.preventDefault();

        if (e.detail === 2) {
          appWindow?.toggleMaximize();
        } else {
          appWindow?.startDragging();
        }
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const clickedInsideAnyDropdown = target.closest(".dropdown");
      const openDropdowns = menuRef.current?.querySelectorAll(
        ".dropdown.dropdown-open",
      );

      if (!openDropdowns || openDropdowns.length === 0) {
        return;
      }

      const clickedInsideAboutModal = target.closest("#about_modal .modal-box");
      const clickedInsideNewConnectionModal = target.closest(
        "#new_connection_modal .modal-box",
      );

      if (clickedInsideAboutModal || clickedInsideNewConnectionModal) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(target)) {
        openDropdowns.forEach((dropdown) => {
          dropdown.classList.remove("dropdown-open");
        });
      } else if (clickedInsideAnyDropdown) {
        const clickedDropdown = clickedInsideAnyDropdown;
        openDropdowns.forEach((dropdown) => {
          if (dropdown !== clickedDropdown) {
            dropdown.classList.remove("dropdown-open");
          }
        });
      }
    };

    if (appMenuTitlebar) {
      appMenuTitlebar.addEventListener("mousedown", handleMouseDown);
    }
    document.addEventListener("click", handleDocumentClick);

    return () => {
      if (appMenuTitlebar) {
        appMenuTitlebar.removeEventListener("mousedown", handleMouseDown);
      }
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <div
      id="app-menu-titlebar"
      className="navbar h-10 min-h-10 max-h-10 select-none bg-base-300 border-b border-base-content/10"
      ref={menuRef}
      style={{ position: "relative", zIndex: 10 }}
    >
      <div className="flex-1 flex items-center">
        <span
          className="btn btn-ghost text-sm font-bold normal-case px-3 tracking-wide opacity-70 select-none"
          data-tauri-no-drag
        >
          DB Viewer
        </span>
        <ul className="menu menu-horizontal p-0" data-tauri-no-drag>
          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                role="button"
                aria-haspopup="menu"
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                data-tauri-no-drag
                onKeyDown={handleDropdownKeyDown}
              >
                连接
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <button type="button" onClick={handleNewConnectionClick}>
                    新建连接…
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleItemClick}>
                    打开连接…
                  </button>
                </li>
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li>
                  <button type="button" onClick={handleItemClick}>
                    断开所有连接
                  </button>
                </li>
                <li className="my-1 h-[1px] bg-base-content/30"></li>
                <li>
                  <button type="button" onClick={handleItemClick}>
                    退出
                  </button>
                </li>
              </ul>
            </div>
          </li>

          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                role="button"
                aria-haspopup="menu"
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                data-tauri-no-drag
                onKeyDown={handleDropdownKeyDown}
              >
                主题
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-56 max-h-96 overflow-y-auto"
              >
                {themes.map((themeName) => (
                  <li key={themeName}>
                    <button
                      type="button"
                      aria-current={theme === themeName}
                      className={theme === themeName ? "active" : ""}
                      onClick={() => handleThemeChange(themeName)}
                    >
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </li>

          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                role="button"
                aria-haspopup="menu"
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                data-tauri-no-drag
                onKeyDown={handleDropdownKeyDown}
              >
                视图
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <button type="button" onClick={handleItemClick}>
                    刷新
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleItemClick}>
                    全屏
                  </button>
                </li>
              </ul>
            </div>
          </li>

          <li>
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                role="button"
                aria-haspopup="menu"
                className="dropdown-toggle cursor-pointer normal-case py-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                data-tauri-no-drag
                onKeyDown={handleDropdownKeyDown}
              >
                帮助
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <button type="button" onClick={handleAboutClick}>
                    关于
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleItemClick}>
                    检查更新…
                  </button>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>

      <div className="flex-none" data-tauri-no-drag>
        <button
          type="button"
          aria-label="最小化窗口"
          title="最小化"
          className="btn btn-ghost btn-xs w-8 h-8 text-base-content/50 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={() => appWindow?.minimize()}
        >
          <span aria-hidden="true">─</span>
        </button>
        <button
          type="button"
          aria-label="最大化或还原窗口"
          title="最大化 / 还原"
          className="btn btn-ghost btn-xs w-8 h-8 text-base-content/50 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={() => appWindow?.toggleMaximize()}
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          type="button"
          aria-label="关闭窗口"
          title="关闭"
          className="btn btn-ghost btn-xs w-8 h-8 text-base-content/50 hover:bg-error hover:text-error-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={() => appWindow?.close()}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <AboutModal isOpen={showAboutModal} onClose={handleCloseAboutModal} />

      <NewConnectionModal
        isOpen={showNewConnectionModal}
        onClose={handleCloseNewConnectionModal}
        // START_OF_MODIFICATION
        // AppMenu 只需要知道连接已更新，然后通知父组件重新加载连接
        onSaveSuccess={() => onConnectionCreated()}
        // END_OF_MODIFICATION
      />
    </div>
  );
}

export default AppMenu;
