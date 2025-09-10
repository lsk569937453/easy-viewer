import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DatabaseViewer from "./components/DatabaseViewer";
import AppMenu from "./components/AppMenu";
import { Toaster } from 'react-hot-toast';

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
       <Toaster
        position="top-center" // 设置通知的默认位置
        reverseOrder={false}
        toastOptions={{
          // 为所有通知定义默认样式
          className: '',
          duration: 5000, // 默认显示5秒
          style: {
            background: '#363636', // 可以自定义背景
            color: '#fff',       // 和文字颜色
          },

          // 针对成功/失败消息的特定样式 (可选)
          success: {
            duration: 3000,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
          error: {
            duration: 4000,
          },
        }}
      />
    </div>
  );
}

export default App;