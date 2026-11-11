import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FaCheck,
  FaRegWindowMaximize,
  FaTimes,
  FaWindowMinimize,
} from "react-icons/fa";
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

const TITLEBAR_TRIGGER_CLASS =
  "dropdown-toggle flex-shrink-0 rounded-[var(--radius-control)] px-2.5 py-1 text-[13px] font-medium text-base-content/70 transition-colors hover:bg-hover hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-2 rounded-[4px] px-2.5 py-1.5 text-left text-[13px]";

const WINDOW_BUTTON_CLASS =
  "app-icon-btn h-7 w-7 rounded-[var(--radius-control)]";

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
      // daisyUI 5 的下拉在 :focus-within 时同样展开，因此 Esc 还需要移开焦点
      dropdown.classList.remove("dropdown-open");
      event.currentTarget.blur();
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
      className="navbar h-10 min-h-10 max-h-10 select-none gap-0 border-b border-hairline bg-base-100 px-2"
      ref={menuRef}
      style={{ position: "relative", zIndex: 10 }}
    >
      <div className="flex flex-1 items-center gap-0.5">
        <div
          className="mr-1 flex items-center gap-2 pl-1 pr-2"
          data-tauri-no-drag
        >
          <span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-primary text-[9px] font-bold leading-none text-primary-content"
            aria-hidden="true"
          >
            DB
          </span>
          <span className="text-[13px] font-semibold tracking-tight">
            DB Viewer
          </span>
        </div>

        <ul className="menu menu-horizontal gap-0.5 p-0">
          <MenuDropdown label="连接" onKeyDown={handleDropdownKeyDown}>
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleNewConnectionClick}
              >
                新建连接…
              </button>
            </li>
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleItemClick}
              >
                打开连接…
              </button>
            </li>
            <li className="my-1 h-px bg-hairline" aria-hidden="true" />
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleItemClick}
              >
                断开所有连接
              </button>
            </li>
            <li className="my-1 h-px bg-hairline" aria-hidden="true" />
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleItemClick}
              >
                退出
              </button>
            </li>
          </MenuDropdown>

          <MenuDropdown
            label="主题"
            onKeyDown={handleDropdownKeyDown}
            panelClassName="w-56 max-h-96 overflow-y-auto"
          >
            {themes.map((themeName) => (
              <li key={themeName}>
                <button
                  type="button"
                  aria-current={theme === themeName}
                  className={`${MENU_ITEM_CLASS} ${
                    theme === themeName ? "bg-accent-soft text-primary" : ""
                  }`}
                  onClick={() => handleThemeChange(themeName)}
                >
                  <span>
                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                  </span>
                  {theme === themeName ? (
                    <FaCheck size="0.7em" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            ))}
          </MenuDropdown>

          <MenuDropdown label="视图" onKeyDown={handleDropdownKeyDown}>
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleItemClick}
              >
                刷新
              </button>
            </li>
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleItemClick}
              >
                全屏
              </button>
            </li>
          </MenuDropdown>

          <MenuDropdown label="帮助" onKeyDown={handleDropdownKeyDown}>
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleAboutClick}
              >
                关于
              </button>
            </li>
            <li>
              <button
                type="button"
                className={MENU_ITEM_CLASS}
                onClick={handleItemClick}
              >
                检查更新…
              </button>
            </li>
          </MenuDropdown>
        </ul>
      </div>

      <div className="flex flex-none items-center gap-0.5" data-tauri-no-drag>
        <button
          type="button"
          aria-label="最小化窗口"
          title="最小化"
          className={WINDOW_BUTTON_CLASS}
          onClick={() => appWindow?.minimize()}
        >
          <FaWindowMinimize size="0.72em" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="最大化或还原窗口"
          title="最大化 / 还原"
          className={WINDOW_BUTTON_CLASS}
          onClick={() => appWindow?.toggleMaximize()}
        >
          <FaRegWindowMaximize size="0.72em" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="关闭窗口"
          title="关闭"
          className={`${WINDOW_BUTTON_CLASS} hover:bg-error hover:text-error-content`}
          onClick={() => appWindow?.close()}
        >
          <FaTimes size="0.72em" aria-hidden="true" />
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
