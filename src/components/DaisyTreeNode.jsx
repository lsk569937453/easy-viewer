import React from "react";
import {
  FaInfoCircle,
  FaSyncAlt,
  FaPlus,
  FaTrashAlt,
  FaEdit,
} from "react-icons/fa";
import ContextMenuWrapper from "./ContextMenuWrapper"; 

const ACTION_ICON_MAP = {
  info: <FaInfoCircle />,
};

const ACTIONABLE_DB_TYPES = ["mysql", "sqlite", "postgresql", "oracle"];
const HOVER_ACTION_TYPES = ["query", "tables", "views", "columns", "index", "partitions"];

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
}) {
  const isSelected = selectedNode?.id === node.id;
  const isOpen = openNodes[node.id];
  const isExpandable =
    node.children === null ||
    (Array.isArray(node.children) && node.children.length > 0);
  
  const isRootNode = ACTIONABLE_DB_TYPES.includes(node.type);

  const handleRowClick = () => {
    onNodeClick(node);
    if (isExpandable) {
      onToggle(node);
    }
  };

  const handleActionIconClick = (e) => {
    e.stopPropagation();
    console.log(`Action button clicked for node: ${node.name}`, node);
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

  const shouldShowAddButton =
    node.iconName === "column" || node.iconName === "primary";
    
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

  const nodeContent = (
    <a
      className={`${
        isSelected ? "active" : ""
      } group flex justify-between items-center w-full`}
      onClick={handleRowClick}
    >
      <div className="flex items-center overflow-hidden flex-1">
        <div className="w-6 text-center mr-1 flex items-center justify-center">
          {node.isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            isExpandable && (
              <span className="cursor-pointer">{isOpen ? "▼" : "▶"}</span>
            )
          )}
        </div>
        {node.icon && <span className="mr-2 flex-shrink-0">{node.icon}</span>}
        <div className="flex items-baseline overflow-hidden flex-1">
          <span className="truncate font-medium">{node.name}</span>
          {node.description && (
            <span className="ml-2 text-xs text-base-content/60 truncate max-w-[200px]">
              {node.description}
            </span>
          )}
        </div>
      </div>

      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        {ACTIONABLE_DB_TYPES.includes(node.type) ? (
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
              title="新增"
              onClick={handleAddClick}
            >
              <FaPlus />
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
          <>
            {node.iconName === "singleTable" ? (
              <button
                className="btn btn-ghost btn-circle btn-xs"
                title="编辑"
                onClick={handleEditClick}
              >
                <FaEdit />
              </button>
            ) : (
              <>
                {shouldShowAddButton ? (
                  <button
                    className="btn btn-ghost btn-circle btn-xs"
                    title="新增"
                    onClick={handleAddClick}
                  >
                    <FaPlus />
                  </button>
                ) : (
                  <>
                    {HOVER_ACTION_TYPES.includes(node.iconName) && (
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
                          title="新增"
                          onClick={handleAddClick}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    )}
                    {node.iconName &&
                      !HOVER_ACTION_TYPES.includes(node.iconName) && (
                        <button
                          className="btn btn-ghost btn-circle btn-xs"
                          onClick={handleActionIconClick}
                        >
                          {ACTION_ICON_MAP[node.iconName] || <FaInfoCircle />}
                        </button>
                      )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </a>
  );

  return (
    <li>
      {isRootNode ? (
        <ContextMenuWrapper menuItems={rootNodeMenuItems}>
          {nodeContent}
        </ContextMenuWrapper>
      ) : (
        nodeContent
      )}

      {isExpandable && isOpen && !node.isLoading && (
        <ul>
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
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default DaisyTreeNode;