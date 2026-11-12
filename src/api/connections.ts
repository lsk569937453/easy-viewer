import type {
  BaseConfig,
  SaveConnectionRequest,
  UpdateConnectionRequest,
} from "../types/backend";
import { BACKEND_COMMANDS, callBackend } from "./client";

/** 连接管理相关命令（返回值仍是后端 JSON 字符串，由调用方 parseBaseResponse）。 */
export const fetchBaseConfigList = (): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.getBaseConfig);

export const fetchBaseConfigById = (baseConfigId: number): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.getBaseConfigById, { baseConfigId });

export const saveConnection = (
  saveConnectionRequest: SaveConnectionRequest,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.saveBaseConfig, {
    saveConnectionRequest,
  });

export const updateConnection = (
  saveConnectionRequest: UpdateConnectionRequest,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.updateBaseConfig, {
    saveConnectionRequest,
  });

export const deleteConnection = (baseConfigId: number): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.deleteBaseConfig, { baseConfigId });

/** 测试连接：参数体即一份连接配置。 */
export const testConnection = (
  testDatabaseRequest: BaseConfig,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.testUrl, { testDatabaseRequest });
