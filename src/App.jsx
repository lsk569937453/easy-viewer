import DatabaseViewer from "./components/DatabaseViewer";
import AppMenu from "./components/AppMenu"; // 导入新的菜单组件

function App() {
  return (
    <div className="App flex h-screen flex-col bg-base-300">
      <AppMenu />
      <main className="main-content flex-grow p-4 h-full w-full overflow-hidden ">
        <DatabaseViewer />
      </main>
    </div>
  );
}

export default App;
