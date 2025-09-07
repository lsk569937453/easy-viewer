// src/components/DaisyTreeNode.jsx
import React from 'react';

function DaisyTreeNode({ node, selectedNode, openNodes, onNodeClick, onToggle }) {
  const isSelected = selectedNode?.id === node.id;
  const isOpen = openNodes[node.id];
  const isParent = node.children && node.children.length > 0;

  const handleToggle = (e) => {
    e.stopPropagation(); // 防止点击箭头时触发行点击事件
    if (isParent) {
      onToggle(node.id);
    }
  };

  const handleNodeClick = () => {
    onNodeClick(node);
  };

  return (
    <li>
      <a
        className={`${isSelected ? 'active' : ''}`}
        onClick={handleNodeClick}
      >
        {isParent && (
          <span onClick={handleToggle} className="w-6 text-center cursor-pointer mr-1">
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        {/* 如果不是父节点，添加一个占位符以保持对齐 */}
        {!isParent && <span className="w-6 inline-block"></span>}

        {node.name}
      </a>

      {/* --- 递归渲染子节点 --- */}
      {isParent && isOpen && (
        <ul>
          {node.children.map((child) => (
            <DaisyTreeNode
              key={child.id}
              node={child}
              selectedNode={selectedNode}
              openNodes={openNodes}
              onNodeClick={onNodeClick}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default DaisyTreeNode;