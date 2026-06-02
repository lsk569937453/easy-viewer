import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DatabaseViewer from "./components/DatabaseViewer";
import AppMenu from "./components/AppMenu";
import { Toaster } from "react-hot-toast";

function App() {
  const [connections, setConnections] = useState([]);

  // 组件挂载完成后通知 Rust 端显示窗口
  useEffect(() => {
    invoke("show_main_window");
  }, []);

  // 辅助函数：解析 connection_json 字符串以获取 host 和 port
  const parseConnectionJson = (connectionType, connectionJsonString) => {
    try {
      const connJson = JSON.parse(connectionJsonString);
      if (connectionType === 1) {
        // MySQL
        return { host: connJson.mysql?.host, port: connJson.mysql?.port };
      } else if (connectionType === 2) {
        // Oracle
        return { host: connJson.oracle?.host, port: connJson.oracle?.port };
      } else if (connectionType === 3) {
        // SQLite
        // SQLite 通常没有 host/port。我们使用 file_path 作为“主机”显示。
        return { host: connJson.sqlite?.file_path || "localhost", port: null };
      }
    } catch (e) {
      console.error("App: 解析 connection_json 失败:", e);
    }
    return { host: null, port: null }; // 默认或错误情况
  };

  /**
   * 从后端获取并更新数据库连接列表 (用于初始加载、删除后的全局刷新)
   */
  const fetchConnections = async () => {
    try {
      const responseJson = await invoke("get_base_config");
      const baseResponse = JSON.parse(responseJson);

      if (baseResponse.response_code === 0) {
        const connectionData = baseResponse.response_msg;
        // 遍历所有连接，解析它们的 connection_json 并添加 host/port 属性
        const processedConnections = (
          connectionData.base_config_list || []
        ).map((conn) => {
          const { host, port } = parseConnectionJson(
            conn.connection_type,
            conn.connection_json
          );
          return { ...conn, host, port }; // 将解析出的 host 和 port 添加到连接对象中
        });
        // 使用新的数组引用更新状态，这将触发 DatabaseViewer 的 useEffect
        setConnections(processedConnections);
      } else {
        console.error("App: 获取所有连接列表失败:", baseResponse.response_msg);
        alert(`获取所有连接列表失败: ${baseResponse.response_msg}`);
      }
    } catch (error) {
      console.error("App: 调用 get_base_config 时发生异常:", error);
      alert(`调用后端接口时出错: ${error.toString()}`);
    }
  };

  /**
   * 当单个连接更新后，重新获取该连接的最新信息并以不变式更新状态
   * @param {number} updatedConnectionId - 被更新连接的 ID
   */
  const handleSingleConnectionUpdated = async (updatedConnectionId) => {
    try {
      // 调用您提供的后端接口获取单个连接的最新数据
      const responseJson = await invoke("get_base_config_by_id", {
        baseConfigId: updatedConnectionId,
      });
      const baseResponse = JSON.parse(responseJson);

      if (baseResponse.response_code === 0) {
        const rawUpdatedConnection = baseResponse.response_msg; // 这是 GetBaseConnectionByIdResponse 结构
        // 解析新获取连接的 connection_json 以获取 host 和 port
        const { host, port } = parseConnectionJson(
          rawUpdatedConnection.connection_type,
          rawUpdatedConnection.connection_json
        );

        // 构建一个符合 connections 状态数组中元素格式的完整连接对象
        const fullyUpdatedConnection = {
          base_config_id: rawUpdatedConnection.base_config_id,
          connection_name: rawUpdatedConnection.connection_name,
          connection_type: rawUpdatedConnection.connection_type,
          description: rawUpdatedConnection.description,
          connection_json: rawUpdatedConnection.connection_json, // 包含原始 json 字符串
          host: host, // 解析出的 host
          port: port, // 解析出的 port
          // 根据需要添加或保留其他属性，确保与 fetchConnections 返回的结构一致
        };

        // 以不变式更新 connections 状态：查找并替换单个连接，返回一个新数组
        setConnections((prevConnections) =>
          prevConnections.map((conn) =>
            conn.base_config_id === updatedConnectionId
              ? fullyUpdatedConnection // 用新的完整连接对象替换旧的
              : conn
          )
        );
      } else {
        console.error(
          `App: 获取更新后的连接 (ID: ${updatedConnectionId}) 失败:`,
          baseResponse.response_msg
        );
        alert(`获取更新后的连接失败: ${baseResponse.response_msg}`);
        // 发生错误时，作为回退方案，重新获取所有连接以确保数据一致性
        fetchConnections();
      }
    } catch (error) {
      console.error(
        `App: 调用 get_base_config_by_id (ID: ${updatedConnectionId}) 时发生异常:`,
        error
      );
      alert(`调用后端接口时出错: ${error.toString()}`);
      // 发生错误时，作为回退方案，重新获取所有连接以确保数据一致性
      fetchConnections();
    }
  };

  // 组件首次挂载时，加载一次连接列表
  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <div className="App flex h-screen flex-col bg-base-300">
      {/* 将创建连接后的刷新函数传递给 AppMenu */}
      <AppMenu onConnectionCreated={fetchConnections} />
      <main className="main-content flex-grow p-4 h-full w-full overflow-hidden ">
        {/*
          将 connections 数据传递给 DatabaseViewer。
          传递 handleSingleConnectionUpdated 作为 onConnectionUpdated prop，用于单个连接的更新。
          传递 fetchConnections 作为 onConnectionDeleted prop，用于连接删除后的全局刷新。
        */}
        <DatabaseViewer
          connections={connections}
          onConnectionUpdated={handleSingleConnectionUpdated} // 新增 prop
          onConnectionDeleted={fetchConnections} // 复用 fetchConnections 实现删除后的全局刷新
        />
      </main>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: "",
          duration: 5000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: { duration: 3000 },
          error: { duration: 4000 },
        }}
      />
    </div>
  );
}

export default App;
