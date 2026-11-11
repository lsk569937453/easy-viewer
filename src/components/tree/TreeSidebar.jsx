import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FaSearch, FaTimes } from "react-icons/fa";
import TreeRow from "./TreeRow.jsx";
import {
  filterTreeByQuery,
  flattenVisibleNodes,
  isNodeExpandable,
  shouldToggleOnActivate,
} from "./treeModel.js";

const ESTIMATED_ROW_HEIGHT = 36;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 树展示层：搜索框 + 扁平化虚拟滚动 + 键盘导航。
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
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState(null);

  // 输入防抖：让最后一次输入生效
  useEffect(() => {
    if (!searchInput) {
      setQuery("");
      return undefined;
    }
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setQuery("");
  }, []);

  const { filteredRoots, matchCount, forcedOpenNodes } = useMemo(() => {
    if (!query) {
      return { filteredRoots: roots, matchCount: 0, forcedOpenNodes: null };
    }
    const result = filterTreeByQuery(roots, query);
    return {
      filteredRoots: result.roots,
      matchCount: result.matchCount,
      forcedOpenNodes: result.expanded,
    };
  }, [roots, query]);

  // 过滤态下强制展开命中节点的祖先链，但不写回 openNodes
  const effectiveOpenNodes = useMemo(
    () => (forcedOpenNodes ? { ...openNodes, ...forcedOpenNodes } : openNodes),
    [openNodes, forcedOpenNodes]
  );

  const flatRows = useMemo(
    () => flattenVisibleNodes(filteredRoots, effectiveOpenNodes),
    [filteredRoots, effectiveOpenNodes]
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
      if (!row || !row.node) return;
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
      case "Escape":
        if (searchInput || query) {
          event.preventDefault();
          handleClearSearch();
        }
        break;
      default:
        break;
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClearSearch();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (flatRows.length > 0) {
        scrollRef.current?.focus();
        focusRowAt(0);
      }
    }
  };

  const focusedKey =
    focusedId && flatRows.some((row) => row.key === focusedId)
      ? focusedId
      : null;

  const noMatch = Boolean(query) && matchCount === 0;

  return (
    <>
      <div className="flex-shrink-0 px-2 pt-2">
        <div className="relative">
          <input
            className="input input-sm input-ghost w-full pr-8"
            placeholder="搜索节点..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="搜索节点"
          />
          {searchInput ? (
            <button
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              title="清空搜索"
              onClick={handleClearSearch}
            >
              <FaTimes />
            </button>
          ) : (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-base-content/30 pointer-events-none">
              <FaSearch />
            </span>
          )}
        </div>
        {query && (
          <div className="px-1 pt-1 text-[11px] text-base-content/50">
            {matchCount > 0 ? `${matchCount} 项匹配` : "无匹配结果"}
          </div>
        )}
      </div>

      {noMatch ? (
        <div className="flex-1 overflow-hidden p-6 text-center text-base-content/40">
          <p className="text-sm">无匹配结果</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          role="tree"
          aria-label="导航树"
          tabIndex={0}
          aria-activedescendant={
            focusedKey ? `tree-item-${focusedKey}` : undefined
          }
          className="flex-1 overflow-y-auto overflow-x-hidden outline-none"
          onKeyDown={handleKeyDown}
        >
        <div
          className="relative w-full"
          role="presentation"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = flatRows[virtualRow.index];
            if (!row) return null;
            // 不用 transform 定位：transform 会成为 position:fixed 后代的包含块，
            // 导致右键菜单坐标错位
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                role="presentation"
                className="absolute left-0 w-full"
                style={{ top: virtualRow.start }}
              >
                <TreeRow
                  row={row}
                  selectedNodeId={selectedNodeId}
                  query={query}
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
    )}
  </>
  );
}

export default TreeSidebar;
