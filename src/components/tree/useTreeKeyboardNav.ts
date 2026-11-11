import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { TreeNode, VisibleTreeRow } from "../../types/tree";
import { isNodeExpandable } from "./treeModel";

interface UseTreeKeyboardNavOptions {
  flatRows: VisibleTreeRow[];
  focusedId: string | null;
  focusRowAt: (index: number) => void;
  activateRow: (row: VisibleTreeRow) => void;
  onToggle: (node: TreeNode) => void;
  searchInput: string;
  query: string;
  onClearSearch: () => void;
}

/**
 * 树键盘导航：↑/↓ 移动、→ 展开/进入子节点、← 收起/回到父节点、
 * Enter/Space 激活、Home/End 跳到首尾、Esc 退出搜索。
 */
export const useTreeKeyboardNav = ({
  flatRows,
  focusedId,
  focusRowAt,
  activateRow,
  onToggle,
  searchInput,
  query,
  onClearSearch,
}: UseTreeKeyboardNavOptions) => {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (flatRows.length === 0) return;

    const currentIndex = flatRows.findIndex((row) => row.key === focusedId);
    const currentRow = currentIndex >= 0 ? flatRows[currentIndex] : null;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRowAt(
          currentIndex < 0
            ? 0
            : Math.min(currentIndex + 1, flatRows.length - 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRowAt(currentIndex <= 0 ? 0 : currentIndex - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (!currentRow) {
          focusRowAt(0);
          break;
        }
        if (
          currentRow.node &&
          isNodeExpandable(currentRow.node) &&
          !currentRow.isOpen
        ) {
          onToggle(currentRow.node);
          break;
        }
        if (currentRow.isOpen && currentRow.hasChildren) {
          focusRowAt(currentIndex + 1);
        }
        break;
      case "ArrowLeft": {
        event.preventDefault();
        if (!currentRow) break;
        if (currentRow.isOpen && currentRow.node) {
          onToggle(currentRow.node);
          break;
        }
        if (currentRow.parentId != null) {
          const parentIndex = flatRows.findIndex(
            (row) =>
              (row.node ? String(row.node.id) : row.key) ===
              String(currentRow.parentId),
          );
          if (parentIndex >= 0) focusRowAt(parentIndex);
        }
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        if (currentRow) activateRow(currentRow);
        break;
      case "Home":
        event.preventDefault();
        focusRowAt(0);
        break;
      case "End":
        event.preventDefault();
        focusRowAt(flatRows.length - 1);
        break;
      case "Escape":
        if (searchInput || query) {
          event.preventDefault();
          onClearSearch();
        }
        break;
      default:
        break;
    }
  };

  return handleKeyDown;
};
