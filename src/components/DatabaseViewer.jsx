// src/components/DatabaseViewer.jsx
import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DaisyTreeNode from "./DaisyTreeNode.jsx";
import { DiMysql } from "react-icons/di";
import { SiOracle, SiSqlite } from "react-icons/si";
import { FaTable, FaEye, FaFolder } from "react-icons/fa";

const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  table: <FaTable />,
  view: <FaEye />,
  default: <FaFolder />,
};

const getNodeIcon = (nodeType) => {
  const type = nodeType?.toLowerCase();
  return ICON_MAP[type] || ICON_MAP.default;
};

const updateNodeInTree = (nodes, nodeId, updates) => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      const updatedChildren = updateNodeInTree(node.children, nodeId, updates);
      if (updatedChildren !== node.children) {
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });
};


function DatabaseViewer({ connections }) {
  const [treeData, setTreeData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [openNodes, setOpenNodes] = useState({});

  useEffect(() => {
    const newTreeData = (connections || []).map((conn) => {
      console.log("conn", conn);
        const dbTypeMap = { 1: "mysql", 2: "oracle", 3: "sqlite"};
        const dbType = dbTypeMap[conn.connection_type] || 'default';
        
        return {
            id: `conn-${conn.base_config_id}`,
            name: conn.connection_name,
            type: dbType,
            icon: getNodeIcon(dbType),
            iconName:dbType,
         
            description: conn.description, 
            details: `ID: ${conn.base_config_id}\n类型: ${dbType.toUpperCase()}`, 
            children: null, 
            path: [{ level: 1, config_value: conn.base_config_id.toString() }],
        };
    });
    setTreeData(newTreeData);
  }, [connections]);

  const handleNodeActivate = (node) => {
    setSelectedNode(node);
  };

  
  const fetchNodeChildren = async (node) => {
    setTreeData(prevTree => updateNodeInTree(prevTree, node.id, { isLoading: true }));

    try {
      const listNodeInfoReq = { level_infos: node.path };
      console.log("Requesting node info:", listNodeInfoReq);
      const responseJson = await invoke("list_node_info", { listNodeInfoReq });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        console.log(response_msg);
        const childNodes = response_msg.list.map((child, index) => ({
          id: `${node.id}-${child.name}-${index}`,
          name: child.name,
          type: child.type || 'default',
          icon: getNodeIcon(child.type),
          description: child.description || '',
          iconName: child.iconName,
          details: `Details for ${child.name}`,
          children: null,
          path: [...node.path, { level: node.path.length + 1, config_value: child.name }],
        }));

        setTreeData(prevTree => updateNodeInTree(prevTree, node.id, {
          children: childNodes,
          isLoading: false
        }));
      } else {
        throw new Error(response_msg);
      }
    } catch (error) {
      console.error("Failed to fetch node children:", error);
      setTreeData(prevTree => updateNodeInTree(prevTree, node.id, {
          children: [],
          isLoading: false
      }));
    }
  };


 
  const handleToggleNode = async (node) => {
    if (node.children === null) {
      await fetchNodeChildren(node);
    }

    setOpenNodes((prev) => ({
      ...prev,
      [node.id]: !prev[node.id],
    }));
  };
  
  const handleRefreshNode = async (node) => {
    console.log("Refreshing node:", node.name);
    await fetchNodeChildren(node);
    
    setOpenNodes((prev) => ({
      ...prev,
      [node.id]: true,
    }));
  };

  const handleAddNode = (node) => {
    console.log("Add action on node:", node.name);
   
    alert(`触发了“新增”操作，目标节点: ${node.name}\n\n您可以在这里实现具体的业务逻辑。`);
  };
  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-[minmax(350px,_1fr)_2fr]">
      <div className="flex flex-col overflow-hidden rounded-lg bg-base-100 shadow-lg">
        <div className="flex-shrink-0 border-b p-4">
          <h2 className="text-xl font-bold">数据库导航</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {treeData && treeData.length > 0 ? (
            <ul className="menu p-0">
              {treeData.map((rootNode) => (
                <DaisyTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  selectedNode={selectedNode}
                  openNodes={openNodes}
                  onNodeClick={handleNodeActivate}
                  onToggle={handleToggleNode}
                     onRefresh={handleRefreshNode}
                  onAdd={handleAddNode}
                />
              ))}
            </ul>
          ) : (
             <div className="text-center text-base-content/60 p-4">
               <p>暂无数据库连接。</p>
               <p className="text-sm mt-2">
                 请通过 "连接" &gt; "新建连接..." 添加一个新的数据库连接。
               </p>
             </div>
          )}
        </div>
      </div>
      <div className="overflow-y-auto rounded-lg bg-base-100 p-6 shadow-lg">
        {selectedNode ? (
          <div>
            <h1 className="text-3xl font-bold mb-4 text-primary flex items-center">
              {selectedNode.icon && <span className="mr-3">{selectedNode.icon}</span>}
              {selectedNode.name}
            </h1>
            <div className="divider"></div>
            {/* --- 改动在这里 --- */}
            {/* 确保这里显示的是 details 字段 */}
            <p className="text-base-content/80 whitespace-pre-wrap">
              {selectedNode.details || "暂无详细描述。"}
            </p>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full">
             <div className="text-center text-base-content/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <p className="mt-4 text-lg">请从左侧列表中选择一个节点</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DatabaseViewer;