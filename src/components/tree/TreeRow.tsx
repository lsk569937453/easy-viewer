import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { FaChevronRight } from "react-icons/fa";
import type {
  RowActionKey,
  TreeNode,
  TreeNodeId,
  VisibleTreeRow,
} from "../../types/tree";
import ContextMenuWrapper, {
  type ContextMenuItem,
} from "../ContextMenuWrapper";
import StatusChip from "../ui/StatusChip";
import { getRowActions, isRootNode } from "./treeModel";

// 命中片段包 <mark>；query 为空时原样返回
const highlightMatch = (text: unknown, query?: string): ReactNode => {
  const source = String(text ?? "");
  if (!query) return source;

  const lowerSource = source.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerQuery) return source;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lowerSource.indexOf(lowerQuery);

  while (index !== -1) {
    if (index > cursor) parts.push(source.slice(cursor, index));
    parts.push(
      <mark
        key={`${index}-${parts.length}`}
        className="bg-transparent text-primary font-semibold"
      >
        {source.slice(index, index + query.length)}
      </mark>,
    );
    cursor = index + query.length;
    index = lowerSource.indexOf(lowerQuery, cursor);
  }

  if (parts.length === 0) return source;
  if (cursor < source.length) parts.push(source.slice(cursor));
  return parts;
};

export interface TreeRowProps {
  row: VisibleTreeRow;
  selectedNodeId?: TreeNodeId | null;
  query?: string;
  focused?: boolean;
  onRowClick: (row: VisibleTreeRow) => void;
  onAction: (node: TreeNode, actionKey: RowActionKey) => void;
  nodeContextMenuItems?: ((node: TreeNode) => ContextMenuItem[] | null) | null;
  onEditConnection?: (node: TreeNode) => void;
  onDeleteConnection?: (node: TreeNode) => void;
}

/**
 * 单行渲染（非递归）：行内容 + hover 动作，动作集合由 getRowActions 决定。
 * 视觉：30px 行高、chevron 代替 ▼▶、版本号改为右侧胶囊、选中态带左侧强调条。
 */
function TreeRow({
  row,
  selectedNodeId,
  query,
  focused,
  onRowClick,
  onAction,
  nodeContextMenuItems,
  onEditConnection,
  onDeleteConnection,
}: TreeRowProps) {
  const { node, depth, isExpandable, isOpen } = row;

  // 占位行：父节点已展开但仍在加载
  if (row.isPlaceholder || !node) {
    return (
      <div
        role="presentation"
        className="py-1 text-micro text-base-content/40"
        style={{ paddingLeft: 6 + depth * 14 + 20 }}
      >
        加载中…
      </div>
    );
  }

  const isSelected =
    selectedNodeId != null && String(selectedNodeId) === String(node.id);
  const isOffline = node.offline === true;
  const isRoot = isRootNode(node);

  // 非根节点按需生成右键菜单（如 WebDAV 的复制/重命名/删除）；点击统一由行处理
  const rowMenuItems =
    !isRoot && nodeContextMenuItems ? nodeContextMenuItems(node) : null;

  const rootMenuItems: ContextMenuItem[] | null = isRoot
    ? [
        {
          label: "编辑连接",
          onClick: () => onEditConnection?.(node),
        },
        {
          label: "删除连接",
          onClick: () => onDeleteConnection?.(node),
        },
      ]
    : null;

  const actions = getRowActions(node);
  const nodeIconToRender = node.icon;

  const handleRowClick = () => {
    // 交给展示层决定"激活 + 是否额外 toggle"，行本身不做递归/展开判断
    onRowClick(row);
  };

  const handleActionClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    actionKey: RowActionKey,
  ) => {
    event.stopPropagation();
    onAction(node, actionKey);
  };

  const rowContent = (
    <div
      id={`tree-item-${node.id}`}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isExpandable ? !!isOpen : undefined}
      tabIndex={-1}
      className={[
        "group relative flex min-h-[30px] w-full select-none items-center gap-1.5 rounded-[var(--radius-control)] pr-1 transition-colors cursor-pointer",
        isSelected ? "bg-accent-soft text-primary" : "hover:bg-hover",
        isOffline ? "opacity-50" : "",
        focused ? "ring-1 ring-inset ring-primary/40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ paddingLeft: 6 + depth * 14 }}
      onClick={handleRowClick}
    >
      {isSelected ? (
        <span
          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary"
          aria-hidden="true"
        />
      ) : null}

      <span
        className="flex w-4 flex-shrink-0 items-center justify-center text-base-content/45"
        aria-hidden="true"
      >
        {node.isLoading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : isExpandable ? (
          <FaChevronRight
            size="0.62em"
            className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        ) : null}
      </span>

      {nodeIconToRender ? (
        <span
          className="mr-0.5 flex flex-shrink-0 items-center text-[13px] leading-none"
          aria-hidden="true"
        >
          {nodeIconToRender}
        </span>
      ) : null}

      <span
        className="min-w-0 flex-1 truncate text-[12.5px] font-medium"
        title={node.name}
      >
        {highlightMatch(node.name, query)}
      </span>

      {isOffline ? (
        <StatusChip className="flex-shrink-0">离线</StatusChip>
      ) : null}
      {!isOffline && node.error && !node.isLoading ? (
        <StatusChip tone="error" className="flex-shrink-0">
          加载失败
        </StatusChip>
      ) : null}
      {!isOffline && node.description ? (
        <span className="max-w-[180px] flex-shrink-0 truncate text-micro text-base-content/45">
          {highlightMatch(node.description, query)}
        </span>
      ) : null}
      {isRoot && node.version ? (
        <StatusChip className="flex-shrink-0" title={node.version}>
          {node.version}
        </StatusChip>
      ) : null}

      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              className={`app-icon-btn h-6 w-6 ${
                action.key === "refresh" && node.error ? "text-error" : ""
              }`}
              title={action.title}
              aria-label={`${action.title} ${node.name}`}
              onClick={(event) => handleActionClick(event, action.key)}
            >
              <ActionIcon size="0.75em" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );

  if (rootMenuItems) {
    return (
      <ContextMenuWrapper menuItems={rootMenuItems}>
        {rowContent}
      </ContextMenuWrapper>
    );
  }
  if (rowMenuItems && rowMenuItems.length > 0) {
    return (
      <ContextMenuWrapper menuItems={rowMenuItems}>
        {rowContent}
      </ContextMenuWrapper>
    );
  }
  return rowContent;
}

export default TreeRow;
