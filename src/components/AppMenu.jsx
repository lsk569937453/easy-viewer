// src/components/AppMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import AboutModal from "./AboutModal";
import NewConnectionModal from "./NewConnectionModal";

const appWindow = getCurrentWindow();

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
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleItemClick = () => {
    const openDropdowns = menuRef.current?.querySelectorAll(
      ".dropdown.dropdown-open"
    );
    openDropdowns?.forEach((dropdown) =>
      dropdown.classList.remove("dropdown-open")
    );

    if (document.activeElement) {
      document.activeElement.blur();
    }
  };

  const handleThemeChange = (newTheme) => {
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

    const handleMouseDown = (e) => {
      const isNoDragElement = e.target.closest(
        "[data-tauri-no-drag], A, BUTTON, SUMMARY, INPUT, SELECT, TEXTAREA, .dropdown-toggle"
      );

      if (isNoDragElement) {
        return;
      }

      if (e.buttons === 1) {
        e.preventDefault();

        if (e.detail === 2) {
          appWindow.toggleMaximize();
        } else {
          appWindow.startDragging();
        }
      }
    };

    const handleDocumentClick = (event) => {
      const clickedInsideAnyDropdown = event.target.closest(".dropdown");
      const openDropdowns = menuRef.current?.querySelectorAll(
        ".dropdown.dropdown-open"
      );

      if (!openDropdowns || openDropdowns.length === 0) {
        return;
      }

      const clickedInsideAboutModal = event.target.closest(
        "#about_modal .modal-box"
      );
      const clickedInsideNewConnectionModal = event.target.closest(
        "#new_connection_modal .modal-box"
      );

      if (clickedInsideAboutModal || clickedInsideNewConnectionModal) {
        return;
      }

      if (!menuRef.current.contains(event.target)) {
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
      className="navbar h-12 min-h-12 max-h-12 select-none rounded-t-lg bg-base-200"
      ref={menuRef}
      style={{ position: "relative", zIndex: 10 }}
    >
      <div className="flex-1 flex items-center">
        <a className="btn btn-ghost text-xl normal-case" data-tauri-no-drag>
          DB Viewer
        </a>
        <ul className="menu menu-horizontal p-0" data-tauri-no-drag>
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
