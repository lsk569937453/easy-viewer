import React from "react";
import ContextMenuWrapper from "../ContextMenuWrapper";
import { getRowActions, isRootNode } from "./treeModel.js";

// 命中片段包 <mark>；query 为空时原样返回
const highlightMatch = (text, query) => {
  const source = String(text ?? "");
  if (!query) return source;

  const lowerSource = source.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerQuery) return source;

  const parts = [];
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
      </mark>
    );
    cursor = index + query.length;
    index = lowerSource.indexOf(lowerQuery, cursor);
  }

  if (parts.length === 0) return source;
  if (cursor < source.length) parts.push(source.slice(cursor));
  return parts;
};

/**
 * 单行渲染（非递归）：行内容 + hover 动作，动作集合由 getRowActions 决定。
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
}) {
  const { node, depth, isExpandable, isOpen } = row;

  // 占位行：父节点已展开但仍在加载
  if (row.isPlaceholder || !node) {
    return (
      <div
        role="presentation"
        className="text-xs text-base-content/40 py-1"
        style={{ paddingLeft: 8 + depth * 16 + 24 }}
      >
        加载中...
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

  const rootMenuItems = isRoot
    ? [
        {
          label: "编辑连接",
          onClick: () => onEditConnection && onEditConnection(node),
        },
        {
          label: "删除连接",
          onClick: () => onDeleteConnection && onDeleteConnection(node),
        },
      ]
    : null;

  const actions = getRowActions(node);
  const nodeIconToRender = node.icon;

  const handleRowClick = () => {
    // 交给展示层决定"激活 + 是否额外 toggle"，行本身不做递归/展开判断
    onRowClick(row);
  };

  const handleActionClick = (event, actionKey) => {
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
      className={`group flex items-center w-full overflow-hidden rounded-md pr-1 select-none cursor-pointer transition-colors ${
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-base-content/5"
      } ${isOffline ? "opacity-50" : ""} ${focused ? "ring-1 ring-primary/40" : ""}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={handleRowClick}
    >
      <div className="flex items-center overflow-hidden flex-1 min-w-0">
        <div className="w-6 text-center mr-1 flex items-center justify-center flex-shrink-0">
          {node.isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            isExpandable && (
              <span className="cursor-pointer text-[10px] text-base-content/60">
                {isOpen ? "▼" : "▶"}
              </span>
            )
          )}
        </div>
        {nodeIconToRender &&
          (isRoot && node.version ? (
            <div className="mr-2 flex-shrink-0 flex flex-col items-center w-[60px]">
              <span>{nodeIconToRender}</span>
              <span className="block w-14 truncate text-center text-[9px] text-base-content/40 leading-tight mt-0.5">
                {node.version}
              </span>
            </div>
          ) : (
            <span className="mr-2 flex-shrink-0">{nodeIconToRender}</span>
          ))}
        <div
          className="flex items-baseline overflow-hidden flex-1 min-w-0"
          title={node.name}
        >
          <span className="truncate font-medium">
            {highlightMatch(node.name, query)}
          </span>
          {isOffline && (
            <span className="ml-2 badge badge-xs badge-ghost text-[10px] flex-shrink-0">
              离线
            </span>
          )}
          {!isOffline && node.error && !node.isLoading && (
            <span className="ml-2 text-xs text-error flex-shrink-0">加载失败</span>
          )}
          {!isOffline && node.description && (
            <span className="ml-2 text-xs text-base-content/60 truncate max-w-[200px]">
              {highlightMatch(node.description, query)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center space-x-1">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              className={`btn btn-ghost btn-circle btn-xs ${
                action.key === "refresh" && node.error ? "text-error" : ""
              }`}
              title={action.title}
              onClick={(event) => handleActionClick(event, action.key)}
            >
              <ActionIcon />
            </button>
          );
        })}
      </div>
    </div>
  );

  if (rootMenuItems) {
    return <ContextMenuWrapper menuItems={rootMenuItems}>{rowContent}</ContextMenuWrapper>;
  }
  if (rowMenuItems && rowMenuItems.length > 0) {
    return <ContextMenuWrapper menuItems={rowMenuItems}>{rowContent}</ContextMenuWrapper>;
  }
  return rowContent;
}

export default TreeRow;
