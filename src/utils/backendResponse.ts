import type { BaseConfig, BaseResponse } from "../types/backend";

/**
 * JSON.parse 的返回值是 any；前端只应在后端 JSON 边界使用本函数。
 * Rust 端由 serde 序列化（`handle_response!` / `connection_json`），契约见
 * `src-tauri/src/service/cmd.rs` 与 `src-tauri/src/service/base_config_service.rs`。
 */
function parseBackendJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

export function parseBaseResponse<T>(raw: string): BaseResponse<T> {
  return parseBackendJson<BaseResponse<T>>(raw);
}

export function parseConnectionConfig(raw: string): BaseConfig {
  return parseBackendJson<BaseConfig>(raw);
}

/** list_local_folder_files 直接返回 JSON 字符串数组（不是 BaseResponse）。 */
export function parseLocalFolderFiles(raw: string): string[] {
  return parseBackendJson<string[]>(raw);
}
