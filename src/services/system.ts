import { BACKEND_COMMANDS, callBackend } from "./invoke";

/** 窗口相关命令。 */
export const showMainWindow = (): Promise<void> =>
  callBackend<void>(BACKEND_COMMANDS.showMainWindow);
