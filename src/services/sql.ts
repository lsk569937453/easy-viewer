import type { ListNodeInfoReq } from "../types/backend";
import { BACKEND_COMMANDS, callBackend } from "./invoke";

/** SQL 执行与行级变更。 */
export const exeSql = (
  sql: string,
  listNodeInfoReq: ListNodeInfoReq,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.exeSql, { sql, listNodeInfoReq });

export const updateRecord = (
  listNodeInfoReq: ListNodeInfoReq,
  sqls: string[],
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.updateRecord, {
    listNodeInfoReq,
    sqls,
  });

/** 参数名与 `delete_table_row` 的 Tauri 入参一致（见 `src-tauri/src/service/cmd.rs`）。 */
export interface DeleteTableRowParams {
  baseConfigId: number;
  tableName: string;
  rowId: string | null;
  idColumn: string;
  listNodeInfoReq: ListNodeInfoReq;
}

export const deleteTableRow = (params: DeleteTableRowParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.deleteTableRow, { ...params });
