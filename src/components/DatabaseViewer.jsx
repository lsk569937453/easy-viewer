import React, { useState, useEffect, useRef } from "react"; // 新增导入 useRef
import { invoke } from "@tauri-apps/api/core";
import DaisyTreeNode from "./DaisyTreeNode.jsx";
import TabPanel from "./TabPanel.jsx";
import NewConnectionModal from "./NewConnectionModal.jsx";
import { DiMysql } from "react-icons/di";
import TableDetailPage from "./TableDetailPage.jsx";

import { SiOracle, SiSqlite } from "react-icons/si";
import {
  FaTable,
  FaEye,
  FaFolder,
  FaDatabase,
  FaLayerGroup,
  FaKey,
  FaSearch,
  FaColumns,
  FaStream,
  FaStar,
} from "react-icons/fa";

const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  table: <FaTable />,
  view: <FaEye />,
  query: <FaSearch />,
  tables: <FaColumns />,
  views: <FaEye />,
  singleTable: <FaTable />,
  partitions: <FaLayerGroup />,
  columns: <FaColumns />,
  index: <FaKey />,
  column: <FaStream />,
  primary: <FaStar />,
  default: <FaFolder />,
  singleQuery: <FaDatabase />,
};

const getNodeIcon = (nodeType, iconName) => {
  const key = iconName?.toString() || nodeType?.toString() || "default";
  return ICON_MAP[key] || ICON_MAP.default;
};

const updateNodeInTree = (nodes, nodeId, updates) => {
  return nodes.map((node) => {
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

const findConnectionByRootConfigId = (connections, rootConfigId) => {
  return connections.find(
    (conn) => conn.base_config_id.toString() === rootConfigId
  );
};

function DatabaseViewer({ connections, onConnectionsUpdate }) {
  const [treeData, setTreeData] = useState([]);
  const [openNodes, setOpenNodes] = useState({});
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState(null);
  
  // START_OF_MODIFICATION: 新增 State 和 Ref 用于删除确认模态框
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const deleteModalRef = useRef(null);
  // END_OF_MODIFICATION

  useEffect(() => {
    const newTreeData = (connections || []).map((conn) => {
      const dbTypeMap = { 1: "mysql", 2: "oracle", 3: "sqlite" };
      const dbType = dbTypeMap[conn.connection_type] || "default";

      return {
        id: conn.base_config_id,
        name: conn.connection_name,
        type: dbType,
        icon: getNodeIcon(dbType, null),
        iconName: dbType,
        description: conn.description,
        details: `ID: ${
          conn.base_config_id
        }\n类型: ${dbType.toUpperCase()}\n主机: ${conn.host}:${conn.port}`,
        children: null,
        path: [{ level: 1, config_value: conn.base_config_id.toString() }],
      };
    });
    setTreeData(newTreeData);
  }, [connections]);

  const generateSqlForNode = (node, allConnections, limit = 100) => {
    if (!node || node.iconName !== "singleTable") {
      return "此节点类型不适用于SQL生成。";
    }

    const rootConfigId = node.path[0].config_value;
    const connection = allConnections.find(
      (conn) => conn.base_config_id.toString() === rootConfigId
    );

    if (!connection) {
      return `/* 错误: 无法找到连接信息来生成SQL */\nSELECT * FROM "${node.name}" LIMIT ${limit};`;
    }

    const dbType = connection.connection_type;
    const tableName = node.name;

    switch (dbType) {
      case 1: // MySQL
        const mysqlDatabaseName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM \`${mysqlDatabaseName}\`.\`${tableName}\` LIMIT ${limit};`;
      case 2: // Oracle
        const oracleSchemaName =
          node.path.length > 2
            ? node.path[1].config_value
            : connection.connection_name;
        return `SELECT * FROM "${oracleSchemaName}"."${tableName}" WHERE ROWNUM <= ${limit};`;
      case 3: // SQLite
        return `SELECT * FROM "${tableName}" LIMIT ${limit};`;
      default:
        return `SELECT * FROM "${tableName}" LIMIT ${limit}; /* 未知数据库类型，使用通用查询 */`;
    }
  };

  const openNewSqlEditorTab = async (
    connectionId,
    connectionName,
    nodeIcon
  ) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
    const defaultQueryName = `New_Query_${timestamp}`;
    const defaultSqlContent = "";

    try {
      const responseJson = await invoke("save_query", {
        connectionId: connectionId,
        queryName: defaultQueryName,
        sql: defaultSqlContent,
        queryId: null,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        const { query_id } = response_msg;
        const newTabId = `sql-editor-${query_id || Date.now()}`;

        const existingSqlEditorTab = tabs.find(
          (tab) => tab.type === "sqlEditor" && tab.queryId === query_id
        );

        if (existingSqlEditorTab) {
          setActiveTabId(existingSqlEditorTab.id);
        } else {
          const newTab = {
            id: newTabId,
            name: defaultQueryName,
            icon: nodeIcon,
            type: "sqlEditor",
            connectionId: connectionId,
            queryId: query_id,
            initialSql: defaultSqlContent,
            isDirty: false,
          };
          setTabs((prevTabs) => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        }
        return true;
      } else {
        console.error(
          "Failed to create new query via save_query:",
          response_msg
        );
        alert(`创建新查询失败: ${response_msg}`);
        return false;
      }
    } catch (err) {
      console.error("Error invoking save_query for new query:", err);
      alert(`创建新查询时发生错误: ${err.message || err.toString()}`);
      return false;
    }
  };

  const handleNodeActivate = async (node) => {
    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      console.error("Connection details not found for node:", node);
      alert("无法找到数据库连接信息。");
      return;
    }

    if (node.iconName === "singleQuery") {
      const queryId = node.path[node.path.length - 1].config_value;
      const newTabId = `sql-editor-${queryId}`;

      const existingSqlEditorTab = tabs.find(
        (tab) => tab.type === "sqlEditor" && tab.queryId === queryId
      );

      if (existingSqlEditorTab) {
        setActiveTabId(existingSqlEditorTab.id);
      } else {
        const newTab = {
          id: newTabId,
          name: node.name,
          icon: node.icon,
          type: "sqlEditor",
          connectionId: connection.base_config_id,
          queryId: queryId,
          initialSql: null,
          isDirty: false,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    }

    if (node.iconName === "query") {
      console.log(
        `点击了 'query' 节点 (${node.name})，但此操作已被禁用。请使用右侧的“新增”按钮。`
      );
      return;
    }

    if (node.iconName === "singleTable") {
      let tabDetails = generateSqlForNode(node, connections);
      const tabId = node.id;
      const existingTab = tabs.find((tab) => tab.id === tabId);

      if (existingTab) {
        if (existingTab.initialSql !== tabDetails) {
          setTabs((prevTabs) =>
            prevTabs.map((tab) =>
              tab.id === tabId ? { ...tab, initialSql: tabDetails } : tab
            )
          );
        }
        setActiveTabId(tabId);
      } else {
        const newTab = {
          id: tabId,
          name: node.name,
          icon: node.icon,
          initialSql: tabDetails,
          iconName: node.iconName,
          path: node.path,
          type: "tableWorkspace",
          connectionId: connection.base_config_id,
          activeTabNode: node,
          connectionDetails: connection,
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    }

    let tabDetails = node.details;
    const existingTab = tabs.find((tab) => tab.id === node.id);

    if (existingTab) {
      if (existingTab.details !== tabDetails) {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === node.id ? { ...tab, details: tabDetails } : tab
          )
        );
      }
      setActiveTabId(node.id);
    } else {
      const newTab = {
        id: node.id,
        name: node.name,
        icon: node.icon,
        details: tabDetails,
        iconName: node.iconName,
        path: node.path,
        type: "info",
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const fetchNodeChildren = async (node) => {
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, node.id, { isLoading: true })
    );

    try {
      const listNodeInfoReq = { level_infos: node.path };
      const responseJson = await invoke("list_node_info", { listNodeInfoReq });
      const { response_code, response_msg } = JSON.parse(responseJson);
      if (response_code === 0) {
        const childNodes = response_msg.list.map((child, index) => ({
          id: `${node.id}-${child.name}-${index}`,
          name: child.name,
          type: child.type || "default",
          icon: getNodeIcon(child.type, child.icon_name),
          description: child.description || "",
          iconName: child.icon_name,
          details: `节点: ${child.name}\n类型: ${child.type || "未知"}`,
          children: null,
          path: [
            ...node.path,
            { level: node.path.length + 1, config_value: child.name },
          ],
        }));

        setTreeData((prevTree) =>
          updateNodeInTree(prevTree, node.id, {
            children: childNodes,
            isLoading: false,
          })
        );
      } else {
        throw new Error(response_msg);
      }
    } catch (error) {
      console.error("Failed to fetch node children:", error);
      setTreeData((prevTree) =>
        updateNodeInTree(prevTree, node.id, {
          children: [],
          isLoading: false,
        })
      );
    }
  };

  const handleToggleNode = async (node) => {
    if (node.children === null) {
      await fetchNodeChildren(node);
    }
    setOpenNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
  };

  const handleRefreshNode = async (node) => {
    console.log("Refreshing node:", node.name);
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, node.id, { children: null })
    );
    await fetchNodeChildren(node);
    setOpenNodes((prev) => ({ ...prev, [node.id]: true }));
  };

  const handleAddNode = async (node) => {
    console.log("Add action on node:", node.name);
    if (node.iconName === "query") {
      console.log("node:", node);
      const rootConfigId = node.path[0]?.config_value;
      const connection = findConnectionByRootConfigId(
        connections,
        rootConfigId
      );
      if (connection) {
        const success = await openNewSqlEditorTab(
          parseInt(rootConfigId),
          connection.connection_name,
          node.icon
        );
        if (success) {
          await handleRefreshNode(node);
        }
      } else {
        alert("无法找到数据库连接信息来创建新查询。");
      }
    } else {
      alert(`触发了“新增”操作，目标节点: ${node.name}`);
    }
  };

  const handleEditConnection = (node) => {
    console.log("Editing connection:", node.name, "with ID:", node.id);
    setEditingConnectionId(node.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConnectionId(null);
  };
  
  const handleConnectionModalSaveSuccess = (baseConfigId, isEditMode) => {
    console.log(
      `Connection saved: ID ${baseConfigId}, EditMode: ${isEditMode}`
    );
    if (onConnectionsUpdate) {
      onConnectionsUpdate();
    }
  };


  const handleRequestDeleteConnection = (node) => {
    setNodeToDelete(node);
    deleteModalRef.current?.showModal();
  };

  const handleConfirmDelete = async () => {
    if (!nodeToDelete) return;

    const connectionIdToDelete = nodeToDelete.id;

    try {
      const responseJson = await invoke("delete_base_config", {
        baseConfigId: connectionIdToDelete,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        setTreeData((prevTree) =>
          prevTree.filter((treeNode) => treeNode.id !== connectionIdToDelete)
        );

        setOpenNodes((prevOpenNodes) => {
          const newOpenNodes = { ...prevOpenNodes };
          delete newOpenNodes[connectionIdToDelete];
          return newOpenNodes;
        });

        setTabs((prevTabs) => {
          const remainingTabs = prevTabs.filter(
            (tab) => tab.connectionId !== connectionIdToDelete
          );

          if (
            activeTabId &&
            !remainingTabs.some((tab) => tab.id === activeTabId)
          ) {
            setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : null);
          }
          return remainingTabs;
        });

        if (onConnectionsUpdate) {
          await onConnectionsUpdate();
        }
      } else {
        console.error(
          "Failed to delete connection via delete_base_config:",
          response_msg
        );
        alert(`删除连接失败: ${response_msg}`);
      }
    } catch (err) {
      console.error("Error invoking delete_base_config:", err);
      alert(`删除连接时发生错误: ${err.message || err.toString()}`);
    } finally {
      setNodeToDelete(null);
      deleteModalRef.current?.close();
    }
  };

  const handleCancelDelete = () => {
    setNodeToDelete(null);
    deleteModalRef.current?.close();
  };
  

  const handleEditNode = (node) => {
    if (node.iconName !== "singleTable") return;

    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);
    if (!connection) {
      console.error("Connection details not found for node:", node);
      alert("无法找到数据库连接信息来编辑表详情。");
      return;
    }

    const tabId = `${node.id}-details`;
    const existingTab = tabs.find((tab) => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab = {
        id: tabId,
        name: `${node.name} [Details]`,
        icon: node.icon,
        type: "tableDetail",
        node: node,
        connectionId: connection.base_config_id,
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
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
                  selectedNode={tabs.find((tab) => tab.id === activeTabId)}
                  openNodes={openNodes}
                  onNodeClick={handleNodeActivate}
                  onToggle={handleToggleNode}
                  onRefresh={handleRefreshNode}
                  onAdd={handleAddNode}
                  onEdit={handleEditNode}
                  onEditConnection={handleEditConnection}
                  onDelete={handleRequestDeleteConnection} // 用于悬停按钮
                  onDeleteConnection={handleRequestDeleteConnection} // 用于右键菜单
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
      <TabPanel
        tabs={tabs}
        setTabs={setTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        connections={connections}
        treeData={treeData}
      />
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveSuccess={handleConnectionModalSaveSuccess}
        editingId={editingConnectionId}
      />
      <dialog ref={deleteModalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">确认删除</h3>
          <p className="py-4">
            您确定要删除连接 "
            <span className="font-semibold">{nodeToDelete?.name}</span>
            " 吗? 此操作不可撤销。
          </p>
          <div className="modal-action">
            <button className="btn" onClick={handleCancelDelete}>
              取消
            </button>
            <button className="btn btn-error" onClick={handleConfirmDelete}>
              确认删除
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
           <button onClick={handleCancelDelete}>close</button>
        </form>
      </dialog>
      {/* END_OF_MODIFICATION */}
    </div>
  );
}

export default DatabaseViewer;