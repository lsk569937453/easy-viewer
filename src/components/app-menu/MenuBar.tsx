import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { FaCheck } from "react-icons/fa";
import MenuDropdown, { MENU_ITEM_CLASS } from "./MenuDropdown";
import { formatThemeLabel, THEMES } from "./themes";

interface MenuBarProps {
  theme: string;
  onItemClick: () => void;
  onThemeChange: (themeName: string) => void;
  onAboutClick: () => void;
  onNewConnectionClick: () => void;
}

/** 标题栏左侧：品牌标识 + 连接/主题/视图/帮助四组下拉菜单。 */
function MenuBar({
  theme,
  onItemClick,
  onThemeChange,
  onAboutClick,
  onNewConnectionClick,
}: MenuBarProps) {
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

  return (
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
              onClick={onNewConnectionClick}
            >
              新建连接…
            </button>
          </li>
          <li>
            <button
              type="button"
              className={MENU_ITEM_CLASS}
              onClick={onItemClick}
            >
              打开连接…
            </button>
          </li>
          <li className="my-1 h-px bg-hairline" aria-hidden="true" />
          <li>
            <button
              type="button"
              className={MENU_ITEM_CLASS}
              onClick={onItemClick}
            >
              断开所有连接
            </button>
          </li>
          <li className="my-1 h-px bg-hairline" aria-hidden="true" />
          <li>
            <button
              type="button"
              className={MENU_ITEM_CLASS}
              onClick={onItemClick}
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
          {THEMES.map((themeName) => (
            <li key={themeName}>
              <button
                type="button"
                aria-current={theme === themeName}
                className={`${MENU_ITEM_CLASS} ${
                  theme === themeName ? "bg-accent-soft text-primary" : ""
                }`}
                onClick={() => onThemeChange(themeName)}
              >
                <span>{formatThemeLabel(themeName)}</span>
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
              onClick={onItemClick}
            >
              刷新
            </button>
          </li>
          <li>
            <button
              type="button"
              className={MENU_ITEM_CLASS}
              onClick={onItemClick}
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
              onClick={onAboutClick}
            >
              关于
            </button>
          </li>
          <li>
            <button
              type="button"
              className={MENU_ITEM_CLASS}
              onClick={onItemClick}
            >
              检查更新…
            </button>
          </li>
        </MenuDropdown>
      </ul>
    </div>
  );
}

export default MenuBar;
