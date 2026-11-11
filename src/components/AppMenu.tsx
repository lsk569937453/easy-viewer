import { useRef, useState } from "react";
import AboutModal from "./AboutModal";
import { getAppWindow } from "./app-menu/appWindow";
import MenuBar from "./app-menu/MenuBar";
import { useTauriWindowDrag } from "./app-menu/useTauriWindowDrag";
import { useTheme } from "./app-menu/useTheme";
import WindowControls from "./app-menu/WindowControls";
import NewConnectionModal from "./NewConnectionModal";

interface AppMenuProps {
  onConnectionCreated: () => void;
}

function AppMenu({ onConnectionCreated }: AppMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);

  const { theme, setTheme } = useTheme();

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

  useTauriWindowDrag(menuRef);

  return (
    <div
      id="app-menu-titlebar"
      className="navbar h-10 min-h-10 max-h-10 select-none gap-0 border-b border-hairline bg-base-100 px-2"
      ref={menuRef}
      style={{ position: "relative", zIndex: 10 }}
    >
      <MenuBar
        theme={theme}
        onItemClick={handleItemClick}
        onThemeChange={handleThemeChange}
        onAboutClick={handleAboutClick}
        onNewConnectionClick={handleNewConnectionClick}
      />

      <WindowControls
        onMinimize={() => getAppWindow()?.minimize()}
        onToggleMaximize={() => getAppWindow()?.toggleMaximize()}
        onClose={() => getAppWindow()?.close()}
      />

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
