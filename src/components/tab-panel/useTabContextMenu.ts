import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SetActiveTabId, SetTabs, Tab } from "../../types/tab";

interface TabMenuPosition {
  x: number;
  y: number;
}

interface UseTabContextMenuOptions {
  tabs: Tab[];
  activeTabId: string | null;
  setTabs: SetTabs;
  setActiveTabId: SetActiveTabId;
}

interface UseTabContextMenuResult {
  containerRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  menuVisible: boolean;
  menuPosition: TabMenuPosition;
  handleContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    tabId: string,
  ) => void;
  handleMenuKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  handleCloseLeft: () => void;
  handleCloseRight: () => void;
  handleCloseAll: () => void;
}

/**
 * 标签页右键菜单：位置计算、焦点管理、外部点击关闭与左/右/全部关闭动作。
 * 关闭顺序与 setTabs/setActiveTabId 语义与拆分前完全一致。
 */
export const useTabContextMenu = ({
  tabs,
  activeTabId,
  setTabs,
  setActiveTabId,
}: UseTabContextMenuOptions): UseTabContextMenuResult => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<TabMenuPosition>({
    x: 0,
    y: 0,
  });
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 菜单打开后聚焦第一项，Esc 关闭，保证键盘可用
  useEffect(() => {
    if (!menuVisible) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[role='menuitem']")
      ?.focus();
  }, [menuVisible]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuVisible(false);
    }
  };

  const handleContextMenu = (
    e: ReactMouseEvent<HTMLDivElement>,
    tabId: string,
  ) => {
    e.preventDefault();
    setMenuVisible(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      setMenuPosition({ x: e.clientX, y: e.clientY });
    }
    setSelectedTabId(tabId);
  };

  const handleClickOutside = () => {
    setMenuVisible(false);
  };

  useEffect(() => {
    if (menuVisible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuVisible]);

  const handleCloseLeft = () => {
    if (!selectedTabId) return;
    const currentIndex = tabs.findIndex((tab) => tab.id === selectedTabId);
    const updatedTabs = tabs.slice(currentIndex);
    setTabs(updatedTabs);
    setActiveTabId(updatedTabs[0]?.id || null);
    setMenuVisible(false);
  };

  const handleCloseRight = () => {
    if (!selectedTabId) return;
    const currentIndex = tabs.findIndex((tab) => tab.id === selectedTabId);
    const updatedTabs = tabs.slice(0, currentIndex + 1);
    setTabs(updatedTabs);
    if (activeTabId && !updatedTabs.find((tab) => tab.id === activeTabId)) {
      setActiveTabId(updatedTabs[updatedTabs.length - 1]?.id || null);
    }
    setMenuVisible(false);
  };

  const handleCloseAll = () => {
    setTabs([]);
    setActiveTabId(null);
    setMenuVisible(false);
  };

  return {
    containerRef,
    menuRef,
    menuVisible,
    menuPosition,
    handleContextMenu,
    handleMenuKeyDown,
    handleCloseLeft,
    handleCloseRight,
    handleCloseAll,
  };
};
