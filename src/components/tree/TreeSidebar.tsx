import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type {
  OpenNodes,
  RowActionKey,
  TreeNode,
  TreeNodeId,
  VisibleTreeRow,
} from "../../types/tree";
import type { ContextMenuItem } from "../ContextMenuWrapper";
import { EmptyState } from "../ui/states";
import TreeRow from "./TreeRow";
import TreeSearchHeader from "./TreeSearchHeader";
import {
  filterTreeByQuery,
  flattenVisibleNodes,
  isNodeExpandable,
  shouldToggleOnActivate,
} from "./treeModel";
import { useTreeKeyboardNav } from "./useTreeKeyboardNav";

const ESTIMATED_ROW_HEIGHT = 30;
const SEARCH_DEBOUNCE_MS = 300;

interface TreeSidebarProps {
  roots: TreeNode[];
  openNodes: OpenNodes;
  selectedNodeId?: TreeNodeId | null;
  onRowClick: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
  onAction: (node: TreeNode, actionKey: RowActionKey) => void;
  nodeContextMenuItems?: ((node: TreeNode) => ContextMenuItem[] | null) | null;
  onEditConnection?: (node: TreeNode) => void;
  onDeleteConnection?: (node: TreeNode) => void;
}

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
}: TreeSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // 输入防抖：让最后一次输入生效；清空输入时立即退出过滤态
  const debouncedSearchInput = useDebouncedValue(
    searchInput,
    SEARCH_DEBOUNCE_MS,
  );
  const query = searchInput ? debouncedSearchInput.trim() : "";

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
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
    [openNodes, forcedOpenNodes],
  );

  const flatRows = useMemo(
    () => flattenVisibleNodes(filteredRoots, effectiveOpenNodes),
    [filteredRoots, effectiveOpenNodes],
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
    (index: number) => {
      const row = flatRows[index];
      if (!row) return;
      setFocusedId(row.key);
      virtualizer.scrollToIndex(index, { align: "auto" });
    },
    [flatRows, virtualizer],
  );

  const activateRow = useCallback(
    (row: VisibleTreeRow) => {
      if (!row?.node) return;
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
    [onRowClick, onToggle],
  );

  const handleKeyDown = useTreeKeyboardNav({
    flatRows,
    focusedId,
    focusRowAt,
    activateRow,
    onToggle,
    searchInput,
    query,
    onClearSearch: handleClearSearch,
  });

  const focusedKey =
    focusedId && flatRows.some((row) => row.key === focusedId)
      ? focusedId
      : null;

  const noMatch = Boolean(query) && matchCount === 0;

  return (
    <>
      <TreeSearchHeader
        value={searchInput}
        onChange={setSearchInput}
        onClear={handleClearSearch}
        onSubmit={() => {
          if (flatRows.length === 0) return;
          scrollRef.current?.focus();
          focusRowAt(0);
        }}
        query={query}
        matchCount={matchCount}
      />

      {noMatch ? (
        <div className="flex-1 overflow-hidden">
          <EmptyState
            compact
            title="无匹配结果"
            description="换个关键词，或按 Esc 退出搜索。"
          />
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
          className="flex-1 overflow-y-auto overflow-x-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50"
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
