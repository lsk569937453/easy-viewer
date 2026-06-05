import React from "react";
import {
  FaInfoCircle,
  FaSyncAlt,
  FaPlus,
  FaTrashAlt,
  FaEdit,
  FaDatabase,
} from "react-icons/fa";
import ContextMenuWrapper from "./ContextMenuWrapper";

const ACTION_ICON_MAP = {
  info: <FaInfoCircle />,
};

const ACTIONABLE_DB_TYPES = ["mysql", "sqlite", "postgresql", "oracle", "redis", "mongodb", "clickhouse"];

const NODES_WITH_REFRESH_ADD = [
  "query",
  "tables",
  "views",
  "columns",
  "index",
  "partitions",
  "collections",
  "database",
];

const NODES_WITH_EDIT = ["singleTable"];

const NODES_WITH_ADD_ACTION = ["column", "primary"];
function DaisyTreeNode({
  node,
  selectedNode,
  openNodes,
  onNodeClick,
  onToggle,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  onEditConnection,
  onDeleteConnection,
  onDeleteQuery,
}) {
  const isSelected = selectedNode?.id === node.id;
  const isOpen = openNodes[node.id];
  const isOffline = node.offline === true;
  const isExpandable =
    !isOffline &&
    node.iconName !== "column" &&
    node.iconName !== "primary" &&
    node.iconName !== "singleQuery" &&
    (node.children === null ||
      (Array.isArray(node.children) && node.children.length > 0));

  const isRootNode = ACTIONABLE_DB_TYPES.includes(node.type);

  // 这些节点类型由 handleNodeActivate 自己处理 toggle
  const SELF_TOGGLE_TYPES = ["singleTable"];

  const handleRowClick = () => {
    onNodeClick(node);
    if (
      isExpandable &&
      !SELF_TOGGLE_TYPES.includes(node.iconName)
    ) {
      onToggle(node);
    }
  };

  const handleActionIconClick = (e) => {
    e.stopPropagation();
  };

  const handleRefreshClick = (e) => {
    e.stopPropagation();
    if (onRefresh) {
      onRefresh(node);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (onAdd) {
      onAdd(node);
    }
  };
  const handleDeleteQueryClick = (e) => {
    e.stopPropagation();
    if (onDeleteQuery) {
      onDeleteQuery(node);
    }
  };
  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(node);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(node);
    }
  };

  const rootNodeMenuItems = [
    {
      label: "编辑连接",
      onClick: () => onEditConnection && onEditConnection(node),
    },
    {
      label: "删除连接",
      onClick: () => onDeleteConnection && onDeleteConnection(node),
    },
  ];

  const nodeIconToRender =
    node.iconName === "singleQuery" ? <FaDatabase /> : node.icon;

  const nodeContent = (
    <a
      className={`${
        isSelected ? "active" : ""
      } ${isOffline ? "opacity-50" : ""} group flex items-center w-full overflow-hidden`}
      onClick={handleRowClick}
    >
      <div className="flex items-center overflow-hidden flex-1 min-w-0">
        <div className="w-6 text-center mr-1 flex items-center justify-center">
          {node.isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            isExpandable && (
              <span className="cursor-pointer">{isOpen ? "▼" : "▶"}</span>
            )
          )}
        </div>
        {nodeIconToRender && (
          isRootNode && node.version ? (
            <div className="mr-2 flex-shrink-0 flex flex-col items-center">
              <span>{nodeIconToRender}</span>
              <span className="text-[9px] text-base-content/40 leading-tight mt-0.5">{node.version}</span>
            </div>
          ) : (
            <span className="mr-2 flex-shrink-0">{nodeIconToRender}</span>
          )
        )}
        <div className="flex items-baseline overflow-hidden flex-1 min-w-0" title={node.name}>
          <span className="truncate font-medium">{node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}</span>
          {isOffline && (
            <span className="ml-2 badge badge-xs badge-ghost text-[10px]">离线</span>
          )}
          {!isOffline && node.description && (
            <span className="ml-2 text-xs text-base-content/60 truncate max-w-[200px]">
              {node.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        {isRootNode ? (
          <div className="flex items-center space-x-1">
            <button
              className="btn btn-ghost btn-circle btn-xs"
              title="刷新"
              onClick={handleRefreshClick}
            >
              <FaSyncAlt />
            </button>

            <button
              className="btn btn-ghost btn-circle btn-xs"
              title="删除"
              onClick={handleDeleteClick}
            >
              <FaTrashAlt />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            {node.iconName === "singleQuery" && (
              <button
                className="btn btn-ghost btn-circle btn-xs"
                title="删除查询"
                onClick={handleDeleteQueryClick}
              >
                <FaTrashAlt />
              </button>
            )}
            {NODES_WITH_REFRESH_ADD.includes(node.iconName) && (
              <button
                className="btn btn-ghost btn-circle btn-xs"
                title="刷新"
                onClick={handleRefreshClick}
              >
                <FaSyncAlt />
              </button>
            )}
            {(NODES_WITH_REFRESH_ADD.includes(node.iconName) ||
              NODES_WITH_ADD_ACTION.includes(node.iconName)) && (
              <button
                className="btn btn-ghost btn-circle btn-xs"
                title="新增"
                onClick={handleAddClick}
              >
                <FaPlus />
              </button>
            )}
            {NODES_WITH_EDIT.includes(node.iconName) && (
              <button
                className="btn btn-ghost btn-circle btn-xs"
                title="编辑"
                onClick={handleEditClick}
              >
                <FaEdit />
              </button>
            )}
            {!NODES_WITH_REFRESH_ADD.includes(node.iconName) &&
              !NODES_WITH_ADD_ACTION.includes(node.iconName) &&
              !NODES_WITH_EDIT.includes(node.iconName) &&
              node.iconName !== "singleQuery" &&
              node.iconName !== "primary" &&
              node.iconName && (
                <button
                  className="btn btn-ghost btn-circle btn-xs"
                  onClick={handleActionIconClick}
                  title="信息"
                >
                  {ACTION_ICON_MAP[node.iconName] || <FaInfoCircle />}
                </button>
              )}
          </div>
        )}
      </div>
    </a>
  );

  return (
    <li>
      {isRootNode ? (
        <ContextMenuWrapper menuItems={rootNodeMenuItems} onClick={handleRowClick}>
          <div
            className={`${
              isSelected ? "active" : ""
            } ${isOffline ? "opacity-50" : ""} group flex items-center w-full overflow-hidden`}
          >
            <div className="flex items-center overflow-hidden flex-1 min-w-0">
              <div className="w-6 text-center mr-1 flex items-center justify-center">
                {node.isLoading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  isExpandable && (
                    <span className="cursor-pointer">{isOpen ? "▼" : "▶"}</span>
                  )
                )}
              </div>
              {nodeIconToRender && (
                isRootNode && node.version ? (
                  <div className="mr-2 flex-shrink-0 flex flex-col items-center">
                    <span>{nodeIconToRender}</span>
                    <span className="text-[9px] text-base-content/40 leading-tight mt-0.5">{node.version}</span>
                  </div>
                ) : (
                  <span className="mr-2 flex-shrink-0">{nodeIconToRender}</span>
                )
              )}
              <div className="flex items-baseline overflow-hidden flex-1 min-w-0" title={node.name}>
                <span className="truncate font-medium">{node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}</span>
                {isOffline && (
                  <span className="ml-2 badge badge-xs badge-ghost text-[10px]">离线</span>
                )}
                {!isOffline && node.description && (
                  <span className="ml-2 text-xs text-base-content/60 truncate max-w-[200px]">
                    {node.description}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              <div className="flex items-center space-x-1">
                <button
                  className="btn btn-ghost btn-circle btn-xs"
                  title="刷新"
                  onClick={handleRefreshClick}
                >
                  <FaSyncAlt />
                </button>

                <button
                  className="btn btn-ghost btn-circle btn-xs"
                  title="删除"
                  onClick={handleDeleteClick}
                >
                  <FaTrashAlt />
                </button>
              </div>
            </div>
          </div>
        </ContextMenuWrapper>
      ) : (
        nodeContent
      )}

      {isOpen &&
        (Array.isArray(node.children) && node.children.length > 0 ? (
          <ul className="w-full">
            {node.children.map((child) => (
              <DaisyTreeNode
                key={child.id}
                node={child}
                selectedNode={selectedNode}
                openNodes={openNodes}
                onNodeClick={onNodeClick}
                onToggle={onToggle}
                onRefresh={onRefresh}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                onEditConnection={onEditConnection}
                onDeleteConnection={onDeleteConnection}
                onDeleteQuery={onDeleteQuery}
              />
            ))}
          </ul>
        ) : node.isLoading ? (
          <ul className="w-full">
            <li>
              <span className="text-xs text-base-content/40 pl-9">加载中...</span>
            </li>
          </ul>
        ) : null)}
    </li>
  );
}

export default DaisyTreeNode;
