import ProjectDataViewer from "./components/ProjectDataViewer";
import AppMenu from "./components/AppMenu"; // 导入新的菜单组件

function App() {
  return (
    <div className="App flex h-screen flex-col bg-base-300">
      <AppMenu />
      <main className="main-content flex-grow p-4">
        <ProjectDataViewer />
      </main>
    </div>
  );
}

export default App;
