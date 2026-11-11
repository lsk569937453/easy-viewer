import type { RefObject } from "react";
import { useEffect } from "react";
import { getAppWindow } from "./appWindow";

/**
 * 标题栏窗口拖拽与下拉菜单外部点击关闭。
 * 拖拽过滤器保持原样（交互控件 / data-tauri-no-drag 区域不触发窗口拖动）。
 */
export const useTauriWindowDrag = (
  menuRef: RefObject<HTMLDivElement | null>,
): void => {
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
          getAppWindow()?.toggleMaximize();
        } else {
          getAppWindow()?.startDragging();
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
};
