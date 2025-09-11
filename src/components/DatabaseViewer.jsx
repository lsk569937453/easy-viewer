import React, { useState, useEffect, useRef, useCallback } from "react";
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

// Import the new SQL generation functions
import {
  generateCreateTableSql,
  generateCreateColumnSql,
  generateCreateIndexSql,
} from "../utils/SqlUtils.jsx"; // Adjust path if utils.js is elsewhere

const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  table: <FaTable />, // 可能表示“表”文件夹
  view: <FaEye />, // 可能表示“视图”文件夹
  query: <FaSearch />, // 查询文件夹
  tables: <FaColumns />, // 具体表示“表”集合
  views: <FaEye />, // 具体表示“视图”集合
  singleTable: <FaTable />, // 单个表
  partitions: <FaLayerGroup />,
  columns: <FaColumns />,
  index: <FaKey />,
  column: <FaStream />,
  primary: <FaStar />,
  default: <FaFolder />,
  singleQuery: <FaDatabase />, // 单个已保存的查询
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

function DatabaseViewer({
  connections,
  onConnectionUpdated,
  onConnectionDeleted,
}) {
  const [treeData, setTreeData] = useState([]);
  const [openNodes, setOpenNodes] = useState({}); // 存储节点的展开/关闭状态
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState(null);

  const [nodeToDelete, setNodeToDelete] = useState(null);
  const deleteModalRef = useRef(null);

  const openNodesRef = useRef(openNodes);
  useEffect(() => {
    openNodesRef.current = openNodes;
  }, [openNodes]);

  const fetchNodeChildren = useCallback(async (parentNode) => {
    setTreeData((prevTree) =>
      updateNodeInTree(prevTree, parentNode.id, { isLoading: true })
    );

    try {
      const listNodeInfoReq = { level_infos: parentNode.path };
      const responseJson = await invoke("list_node_info", {
        listNodeInfoReq,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);
      if (response_code === 0) {
        const childNodes = response_msg.list.map((child, index) => ({
          id: `${parentNode.id}-${child.name}-${index}`, // 确保子节点 ID 唯一
          name: child.name,
          type: child.type || "default",
          icon: getNodeIcon(child.type, child.icon_name),
          description: child.description || "",
          iconName: child.icon_name,
          details: `节点: ${child.name}\n类型: ${child.type || "未知"}`,
          children: null, // 新加载的子节点的 children 初始为 null
          path: [
            ...parentNode.path,
            { level: parentNode.path.length + 1, config_value: child.name },
          ],
        }));

        setTreeData((prevTree) =>
          updateNodeInTree(prevTree, parentNode.id, {
            children: childNodes,
            isLoading: false,
          })
        );

        const currentOpenNodes = openNodesRef.current;
        childNodes.forEach(async (childNode) => {
          if (currentOpenNodes[childNode.id]) {
            console.log(
              `DatabaseViewer: Recursively re-fetching children for previously open child node: ${childNode.name} (ID: ${childNode.id})`
            );
            await fetchNodeChildren(childNode); // 递归调用自身
          }
        });
      } else {
        throw new Error(response_msg);
      }
    } catch (error) {
      console.error("Failed to fetch node children:", error);
      setTreeData((prevTree) =>
        updateNodeInTree(prevTree, parentNode.id, {
          children: [], // 获取失败时设为空数组
          isLoading: false,
        })
      );
    }
  }, []);
  const updateQueryNodeNameInTree = useCallback((queryIdToUpdate, newName) => {
    console.log(
      `DatabaseViewer: 收到更新查询节点名称请求。QueryId: ${queryIdToUpdate}, New Name: ${newName}`
    );
    setTreeData((prevTree) => {
      const findAndUpdate = (nodes) => {
        return nodes.map((node) => {
          // 查找类型为 'singleQuery' 且其路径中最后一个 config_value 匹配 queryIdToUpdate 的节点
          if (
            node.iconName === "singleQuery" &&
            node.path &&
            node.path.length > 0 &&
            node.path[node.path.length - 1].config_value.toString() ===
              queryIdToUpdate.toString()
          ) {
            console.log(
              `DatabaseViewer: 正在更新树节点名称: ${node.name} -> ${newName}`
            );
            return { ...node, name: newName };
          }
          // 递归查找子节点
          if (node.children) {
            const updatedChildren = findAndUpdate(node.children);
            if (updatedChildren !== node.children) {
              return { ...node, children: updatedChildren };
            }
          }
          return node;
        });
      };
      return findAndUpdate(prevTree);
    });
  }, []);
  useEffect(() => {
    console.log(
      "DatabaseViewer: useEffect for connections triggered. Connections updated (prop changed):",
      connections
    );

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
        }\n类型: ${dbType.toUpperCase()}\n主机: ${conn.host || "N/A"}:${
          conn.port || "N/A"
        }`,
        children: null, // 总是将根节点的 children 重置为 null，表示需要重新获取
        path: [{ level: 1, config_value: conn.base_config_id.toString() }],
      };
    });
    setTreeData(newTreeData); // 更新根节点列表

    const currentOpenNodes = openNodesRef.current;
    newTreeData.forEach(async (node) => {
      if (currentOpenNodes[node.id] && node.children === null) {
        console.log(
          `DatabaseViewer: Re-fetching children for previously open root node: ${node.name} (ID: ${node.id})`
        );
        await fetchNodeChildren(node); // 调用记忆化后的函数，它现在会递归展开子节点
      }
    });
  }, [connections, fetchNodeChildren]); // ⭐ FIX 5: Removed openNodes from dependencies, relying on ref.

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

  const openSqlEditorTabWithContent = async (
    connectionId,
    nodeIcon, // Icon from the node that triggered this action
    generatedSql = "",
    defaultName = ""
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
    const finalQueryName = defaultName || `New_Query_${timestamp}`;

    try {
      const responseJson = await invoke("save_query", {
        connectionId: connectionId,
        queryName: finalQueryName,
        sql: generatedSql,
        queryId: null, // New query, so no existing queryId
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
          if (
            generatedSql &&
            existingSqlEditorTab.initialSql !== generatedSql
          ) {
            setTabs((prevTabs) =>
              prevTabs.map((t) =>
                t.id === existingSqlEditorTab.id
                  ? { ...t, initialSql: generatedSql, isDirty: true } // Mark as dirty
                  : t
              )
            );
          }
        } else {
          const newTab = {
            id: newTabId,
            name: finalQueryName,
            icon: nodeIcon,
            type: "sqlEditor",
            connectionId: connectionId,
            queryId: query_id,
            initialSql: generatedSql,
            isDirty: !!generatedSql, // Mark dirty if SQL was generated
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
      console.log("existingSqlEditorTab1:", existingSqlEditorTab);

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
    } else if (node.iconName === "singleTable") {
      const tableId = node.path[node.path.length - 1].config_value;
      const newTabId = `singleTable-${tableId}`;
      console.log("tabs:", tabs);
      const existingSqlEditorTab = tabs.find(
        (tab) => tab.type === "singleTable" && tab.id === newTabId
      );
      console.log("existingSqlEditorTab2:", existingSqlEditorTab);
      if (existingSqlEditorTab) {
        setActiveTabId(existingSqlEditorTab.id);
      } else {
        let sql = generateSqlForNode(node, connections);

        const newTab = {
          id: newTabId,
          name: node.name,
          icon: node.icon,
          details: sql,
          iconName: node.iconName,
          path: node.path,
          type: "singleTable",
          initialSql: sql,
          node: node,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    }

    if (
      node.type !== "singleTable" &&
      node.type !== "singleQuery" &&
      node.type !== "column" &&
      node.type !== "primary"
    ) {
      console.log(
        `DatabaseViewer: Clicking expandable parent node (${node.name}), also toggling.`
      );
      await handleToggleNode(node); // 这将处理子节点的获取（如果需要）和 openNodes 状态的切换
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

  const handleToggleNode = async (node) => {
    const isCurrentlyOpen = openNodes[node.id]; // Capture current state before update

    setOpenNodes((prev) => ({ ...prev, [node.id]: !isCurrentlyOpen }));

    if (!isCurrentlyOpen && node.children === null) {
      console.log(
        `DatabaseViewer: Toggling node (${node.name}), fetching children due to opening.`
      );
      await fetchNodeChildren(node);
    }
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
    console.log("Add action on node:", node.name, "Icon Name:", node.iconName);

    const rootConfigId = node.path[0]?.config_value;
    const connection = findConnectionByRootConfigId(connections, rootConfigId);

    if (!connection) {
      alert("无法找到数据库连接信息来执行此操作。");
      return;
    }

    const connectionId = parseInt(rootConfigId);
    const connectionType = connection.connection_type; // 1: mysql, 2: oracle, 3: sqlite
    let generatedSql = "";
    let defaultQueryName = "";

    if (node.iconName === "query") {
    } else if (node.iconName === "tables") {
      const tableName = node.name;
      generatedSql = generateCreateTableSql(connectionType, tableName);
      defaultQueryName = `Create_Table_${tableName}`;
    } else if (
      node.iconName === "columns" ||
      node.iconName === "column" ||
      node.iconName === "primary"
    ) {
      let tableName = "";
      if (node.iconName === "columns") {
        tableName = node.path[node.path.length - 2]?.config_value;
      } else if (node.iconName === "column" || node.iconName === "primary") {
        tableName = node.path[node.path.length - 3]?.config_value;
      }

      if (!tableName) {
        alert("无法确定表名来生成 CREATE COLUMN SQL。");
        return;
      }
      generatedSql = generateCreateColumnSql(connectionType, tableName);
      defaultQueryName = `Add_Column_to_${tableName}`;
    } else if (node.iconName === "index") {
      // 'index' node is typically one level above the table name in the path
      // e.g., path: [conn_id, db_name, table_name, 'index_folder']
      const tableName = node.path[node.path.length - 2]?.config_value;
      if (!tableName) {
        alert("无法确定表名来生成 CREATE INDEX SQL。");
        return;
      }
      generatedSql = generateCreateIndexSql(connectionType, tableName);
      defaultQueryName = `Add_Index_to_${tableName}`;
    } else {
      alert(
        `触发了“新增”操作，目标节点: ${node.name}，但此节点类型不支持生成SQL。`
      );
      return;
    }

    // Now, open the SQL editor tab with the generated SQL or a blank query
    const success = await openSqlEditorTabWithContent(
      connectionId,
      node.icon, // Use the current node's icon for the tab
      generatedSql,
      defaultQueryName
    );

    // If a new query was added to a 'query' folder, refresh that folder.
    if (node.iconName === "query" && success) {
      await handleRefreshNode(node);
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

  // 编辑连接成功后的回调函数，现在调用 onConnectionUpdated prop
  const handleConnectionModalSaveSuccess = (baseConfigId, isEditMode) => {
    console.log(
      `DatabaseViewer: Connection saved: ID ${baseConfigId}, EditMode: ${isEditMode}. Calling onConnectionUpdated().`
    );
    // 调用父组件提供的回调，通知它有一个连接已更新，并传递更新的 ID
    if (onConnectionUpdated) {
      onConnectionUpdated(baseConfigId);
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
        // 删除成功后，从 openNodes 中移除该连接及其所有子节点的展开状态
        // 这种处理方式确保了与被删除连接相关的所有展开状态都被清除
        setOpenNodes((prevOpenNodes) => {
          const newOpenNodes = { ...prevOpenNodes };
          // For simplicity, we can delete the root node's open state.
          // More robust would be to iterate and delete all child open states,
          // but if children are loaded only on demand, this is often enough.
          delete newOpenNodes[connectionIdToDelete];
          return newOpenNodes;
        });

        // 过滤掉与已删除连接相关的任何打开的 Tab
        setTabs((prevTabs) => {
          const remainingTabs = prevTabs.filter(
            (tab) => tab.connectionId !== connectionIdToDelete
          );

          if (
            activeTabId &&
            !remainingTabs.some((tab) => tab.id === activeTabId)
          ) {
            setActiveTabId(
              remainingTabs.length > 0 ? remainingTabs[0].id : null
            );
          }
          return remainingTabs;
        });

        // 调用父组件提供的 onConnectionDeleted 回调来刷新连接列表 (App.jsx 会重新 fetchConnections)
        if (onConnectionDeleted) {
          console.log(
            "DatabaseViewer: Connection deleted. Calling onConnectionDeleted()."
          );
          await onConnectionDeleted();
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
                  openNodes={openNodes} // 将 openNodes 传递给 DaisyTreeNode
                  onNodeClick={handleNodeActivate}
                  onToggle={handleToggleNode}
                  onRefresh={handleRefreshNode}
                  onAdd={handleAddNode} // Modified to handle new SQL generation
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
        onQuerySaved={updateQueryNodeNameInTree}
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
            <span className="font-semibold">{nodeToDelete?.name}</span>" 吗?
            此操作不可撤销。
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
    </div>
  );
}

export default DatabaseViewer;
