import { getCurrentWindow } from "@tauri-apps/api/window";

/** Tauri 窗口句柄；非 Tauri 环境（浏览器 / SSR）下为 null，仅告警一次。 */
let appWindow: ReturnType<typeof getCurrentWindow> | null = null;
try {
  appWindow = getCurrentWindow();
} catch {
  console.warn("Not running in Tauri environment");
}

export const getAppWindow = () => appWindow;
