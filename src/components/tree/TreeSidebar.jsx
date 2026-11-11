import React, { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import TreeRow from "./TreeRow.jsx";
import {
  flattenVisibleNodes,
  isNodeExpandable,
  shouldToggleOnActivate,
} from "./treeModel.js";

const ESTIMATED_ROW_HEIGHT = 36;

/**
 * 树展示层：扁平化 + 虚拟滚动 + 键盘导航。
 * 展开状态（openNodes）与选中状态（selectedNodeId）都由 DatabaseViewer 持有。
 */
function TreeSidebar({
  roots,
  openNodes,
  selectedNodeId,
  onRowClick,
  onToggle,
  onAction,
  nodeContextMenuItems,
  onEditConnection,
  onDeleteConnection,
}) {
  const scrollRef = useRef(null);
  const [focusedId, setFocusedId] = useState(null);

  const flatRows = useMemo(
    () => flattenVisibleNodes(roots, openNodes),
    [roots, openNodes]
  );

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    measureElement: (element) =>
      element?.getBoundingClientRect().height ?? ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => flatRows[index]?.key ?? index,
    overscan: 10,
  });

  const focusRowAt = useCallback(
    (index) => {
      const row = flatRows[index];
      if (!row) return;
      setFocusedId(row.key);
      virtualizer.scrollToIndex(index, { align: "auto" });
    },
    [flatRows, virtualizer]
  );

  const activateRow = useCallback(
    (row) => {
      if (!row) return;
      setFocusedId(row.key);
      onRowClick(row.node);
      // handleNodeActivate 内部已自处理的类型不再重复 toggle，避免双展开
      if (
        isNodeExpandable(row.node) &&
        shouldToggleOnActivate(row.node.iconName)
      ) {
        onToggle(row.node);
      }
    },
    [onRowClick, onToggle]
  );

  const handleKeyDown = (event) => {
    if (flatRows.length === 0) return;

    const currentIndex = flatRows.findIndex((row) => row.key === focusedId);
    const currentRow = currentIndex >= 0 ? flatRows[currentIndex] : null;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRowAt(
          currentIndex < 0 ? 0 : Math.min(currentIndex + 1, flatRows.length - 1)
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
        if (isNodeExpandable(currentRow.node) && !currentRow.isOpen) {
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
        if (currentRow.isOpen) {
          onToggle(currentRow.node);
          break;
        }
        if (currentRow.parentId != null) {
          const parentIndex = flatRows.findIndex(
            (row) => String(row.node.id) === String(currentRow.parentId)
          );
          if (parentIndex >= 0) focusRowAt(parentIndex);
        }
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        activateRow(currentRow);
        break;
      case "Home":
        event.preventDefault();
        focusRowAt(0);
        break;
      case "End":
        event.preventDefault();
        focusRowAt(flatRows.length - 1);
        break;
      default:
        break;
    }
  };

  const focusedKey =
    focusedId && flatRows.some((row) => row.key === focusedId)
      ? focusedId
      : null;

  return (
    <div
      ref={scrollRef}
      role="tree"
      aria-label="导航树"
      tabIndex={0}
      aria-activedescendant={focusedKey ? `tree-item-${focusedKey}` : undefined}
      className="flex-1 overflow-y-auto overflow-x-hidden outline-none"
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = flatRows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <TreeRow
                row={row}
                selectedNodeId={selectedNodeId}
                focused={row.key === focusedKey}
                onRowClick={activateRow}
                onAction={onAction}
                nodeContextMenuItems={nodeContextMenuItems}
                onEditConnection={onEditConnection}
                onDeleteConnection={onDeleteConnection}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TreeSidebar;
