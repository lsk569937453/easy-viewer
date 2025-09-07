// src/components/ProjectDataViewer.jsx

import React, { useState } from 'react';
import DaisyTreeNode from './DaisyTreeNode.jsx'; // 确保导入路径正确
import { treeData } from './treeData.js';       // 确保导入路径正确

function ProjectDataViewer() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [openNodes, setOpenNodes] = useState({});

  const handleNodeActivate = (node) => {
    setSelectedNode(node);
  };

  const handleToggleNode = (nodeId) => {
    setOpenNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  return (
    // 1. Grid 骨架: 占据100%高度，并定义两列的宽度规则。
    <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-[minmax(350px,_1fr)_2fr]">
      
      {/* --- 左侧面板 (第一个 Grid 单元格) --- */}
      {/* 
        2. Grid 单元格边界: 
        - `flex flex-col`: 在单元格内部启用垂直 Flex 布局。
        - `overflow-hidden`: 这是最关键的一步！它创建了一个硬边界，防止内部内容溢出影响 Grid 布局。
      */}
      <div className="flex flex-col overflow-hidden rounded-lg bg-base-100 shadow-lg">
        {/* 内部的头部: 不可压缩，并有自己的内边距 */}
        <div className="flex-shrink-0 border-b p-4">
          <h2 className="text-xl font-bold">项目列表</h2>
        </div>
        
        {/* 
          3. 内部的滚动区域:
          - `flex-1`: 强制此元素填满所有剩余的垂直空间。
          - `overflow-y-auto`: 在这个被`flex-1`确定了大小的、有界的区域内，实现内部滚动。
        */}
        <div className="flex-1 overflow-y-auto p-4">
          <ul className="menu p-0">
            {treeData.map((rootNode) => (
              <DaisyTreeNode
                key={rootNode.id}
                node={rootNode}
                selectedNode={selectedNode}
                openNodes={openNodes}
                onNodeClick={handleNodeActivate}
                onToggle={handleToggleNode}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* --- 右侧面板 (第二个 Grid 单元格) --- */}
      {/* 
        对于右侧，如果整个面板都可以滚动，逻辑会更简单。
        直接让单元格本身处理滚动。
      */}
      <div className="overflow-y-auto rounded-lg bg-base-100 p-6 shadow-lg">
        {selectedNode ? (
          <div>
            <h1 className="text-3xl font-bold mb-4 text-primary">{selectedNode.name}</h1>
            <div className="divider"></div>
            <p className="text-base-content/80 whitespace-pre-wrap">{selectedNode.details || '暂无详细描述。'}</p>
            <div className="mt-6">
              <h3 className="font-semibold text-lg">节点信息</h3>
              <ul className="list-disc list-inside mt-2 bg-base-200 p-4 rounded-md">
                <li><strong>ID:</strong> {selectedNode.id}</li>
                <li><strong>名称:</strong> {selectedNode.name}</li>
                <li><strong>子节点数量:</strong> {selectedNode.children ? selectedNode.children.length : 0}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-base-content/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <p className="mt-4 text-lg">请从左侧列表中选择一个节点</p>
              <p className="text-sm">点击节点的名称来查看其详细信息</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDataViewer;