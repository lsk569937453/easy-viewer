import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DatabaseViewer from "./components/DatabaseViewer";
import AppMenu from "./components/AppMenu";

function App() {
  const [connections, setConnections] = useState([]);

  /**
   * 从后端获取并更新数据库连接列表
   */
  const fetchConnections = async () => {
    try {
      console.log("正在从后端获取连接列表...");
      const responseJson = await invoke("get_base_config");
      const baseResponse = JSON.parse(responseJson);

      if (baseResponse.response_code === 0) {
        // 后端直接返回了对象，response_msg 就是我们需要的 item
        const connectionData = baseResponse.response_msg;
        console.log("成功获取连接列表:", connectionData.base_config_list);
        setConnections(connectionData.base_config_list || []);
      } else {
        console.error(
          "获取连接列表失败:",
          baseResponse.response_msg
        );
        alert(`获取连接列表失败: ${baseResponse.response_msg}`);
      }
    } catch (error) {
      console.error("调用 get_base_config 时发生异常:", error);
      alert(`调用后端接口时出错: ${error.toString()}`);
    }
  };

  // 组件首次挂载时，加载一次连接列表
  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <div className="App flex h-screen flex-col bg-base-300">
      {/* 将刷新函数传递给 AppMenu */}
      <AppMenu onConnectionCreated={fetchConnections} />
      <main className="main-content flex-grow p-4 h-full w-full overflow-hidden ">
        {/* 将连接列表数据传递给 DatabaseViewer 用于渲染 */}
        <DatabaseViewer connections={connections} />
      </main>
    </div>
  );
}

export default App;