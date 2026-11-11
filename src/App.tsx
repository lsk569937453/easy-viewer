import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import AppMenu from "./components/AppMenu";
import DatabaseViewer from "./components/DatabaseViewer";
import {
  fetchBaseConfigById,
  fetchBaseConfigList,
} from "./services/connections";
import { showMainWindow } from "./services/system";
import type {
  ConnectionSummary,
  GetBaseConnectionByIdResponse,
  GetBaseConnectionResponse,
} from "./types/backend";
import { parseBaseResponse } from "./utils/backendResponse";
import { getErrorMessage } from "./utils/error";
import { showError } from "./utils/showToast";

function App() {
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);

  // 组件挂载完成后通知 Rust 端显示窗口
  useEffect(() => {
    void showMainWindow();
  }, []);

  /**
   * 从后端获取并更新数据库连接列表 (用于初始加载、删除后的全局刷新)
   */
  const fetchConnections = async () => {
    try {
      const responseJson = await fetchBaseConfigList();
      const baseResponse =
        parseBaseResponse<GetBaseConnectionResponse>(responseJson);

      if (baseResponse.response_code === 0) {
        // get_base_config 列表项不返回 connection_json/host/port，保持既有展示值 null
        const processedConnections =
          baseResponse.response_msg.base_config_list.map((conn) => ({
            ...conn,
            host: null,
            port: null,
          }));
        // 使用新的数组引用更新状态，这将触发 DatabaseViewer 的 useEffect
        setConnections(processedConnections);
      } else {
        console.error("App: 获取所有连接列表失败:", baseResponse.response_msg);
        showError(`获取所有连接列表失败: ${baseResponse.response_msg}`);
      }
    } catch (error) {
      console.error("App: 调用 get_base_config 时发生异常:", error);
      showError(`调用后端接口时出错: ${getErrorMessage(error)}`);
    }
  };

  /**
   * 当单个连接更新后，重新获取该连接的最新信息并以不变式更新状态
   * @param updatedConnectionId - 被更新连接的 ID
   */
  const handleSingleConnectionUpdated = async (updatedConnectionId: number) => {
    try {
      // 调用您提供的后端接口获取单个连接的最新数据
      const responseJson = await fetchBaseConfigById(updatedConnectionId);
      const baseResponse =
        parseBaseResponse<GetBaseConnectionByIdResponse>(responseJson);

      if (baseResponse.response_code === 0) {
        const rawUpdatedConnection = baseResponse.response_msg; // 这是 GetBaseConnectionByIdResponse 结构

        // 构建一个符合 connections 状态数组中元素格式的完整连接对象
        const fullyUpdatedConnection: ConnectionSummary = {
          base_config_id: rawUpdatedConnection.base_config_id,
          connection_name: rawUpdatedConnection.connection_name,
          connection_type: rawUpdatedConnection.connection_type,
          description: rawUpdatedConnection.description,
          // 列表接口不提供 host/port；保持原逻辑：SQLite(3) 编辑回填后展示 localhost
          host: rawUpdatedConnection.connection_type === 3 ? "localhost" : null,
          port: null,
        };

        // 以不变式更新 connections 状态：查找并替换单个连接，返回一个新数组
        setConnections((prevConnections) =>
          prevConnections.map((conn) =>
            conn.base_config_id === updatedConnectionId
              ? fullyUpdatedConnection // 用新的完整连接对象替换旧的
              : conn,
          ),
        );
      } else {
        console.error(
          `App: 获取更新后的连接 (ID: ${updatedConnectionId}) 失败:`,
          baseResponse.response_msg,
        );
        showError(`获取更新后的连接失败: ${baseResponse.response_msg}`);
        // 发生错误时，作为回退方案，重新获取所有连接以确保数据一致性
        fetchConnections();
      }
    } catch (error) {
      console.error(
        `App: 调用 get_base_config_by_id (ID: ${updatedConnectionId}) 时发生异常:`,
        error,
      );
      showError(`调用后端接口时出错: ${getErrorMessage(error)}`);
      // 发生错误时，作为回退方案，重新获取所有连接以确保数据一致性
      fetchConnections();
    }
  };

  // 组件首次挂载时，加载一次连接列表
  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <div className="App flex h-screen flex-col bg-base-200">
      {/* 将创建连接后的刷新函数传递给 AppMenu */}
      <AppMenu onConnectionCreated={fetchConnections} />
      <main className="flex min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1.5">
        {/*
          将 connections 数据传递给 DatabaseViewer。
          传递 handleSingleConnectionUpdated 作为 onConnectionUpdated prop，用于单个连接的更新。
          传递 fetchConnections 作为 onConnectionDeleted prop，用于连接删除后的全局刷新。
        */}
        <DatabaseViewer
          connections={connections}
          onConnectionUpdated={handleSingleConnectionUpdated}
          onConnectionDeleted={fetchConnections}
        />
      </main>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            padding: "0",
            background: "transparent",
            boxShadow: "none",
            border: "none",
          },
          success: {
            duration: 3000,
            icon: null,
          },
          error: {
            duration: 4000,
            icon: null,
          },
          className: "",
        }}
      />
    </div>
  );
}

export default App;
