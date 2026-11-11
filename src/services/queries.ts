import { BACKEND_COMMANDS, callBackend } from "./invoke";

/** 已保存查询的增删改查。参数名与 `src-tauri/src/service/cmd.rs` 的 Tauri 入参一致。 */

export interface SaveQueryParams {
  connectionId: number;
  queryName: string;
  sql: string;
  databaseName?: string;
}

export const saveQuery = ({
  connectionId,
  queryName,
  sql,
  databaseName,
}: SaveQueryParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.saveQuery, {
    connectionId,
    queryName,
    sql,
    databaseName: databaseName || undefined,
  });

export interface GetQueryParams {
  connectionId: number;
  queryName: string;
  databaseName?: string;
}

export const getQuery = ({
  connectionId,
  queryName,
  databaseName,
}: GetQueryParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.getQuery, {
    connectionId,
    queryName,
    databaseName: databaseName || undefined,
  });

export interface RemoveQueryParams {
  baseConfigId: number;
  queryName: string;
  databaseName?: string;
}

export const removeQuery = ({
  baseConfigId,
  queryName,
  databaseName,
}: RemoveQueryParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.removeQuery, {
    baseConfigId,
    queryName,
    databaseName: databaseName || undefined,
  });

export interface RenameQueryParams {
  connectionId: number;
  oldQueryName: string;
  newQueryName: string;
  databaseName?: string;
}

export const renameQuery = ({
  connectionId,
  oldQueryName,
  newQueryName,
  databaseName,
}: RenameQueryParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.renameQuery, {
    connectionId,
    oldQueryName,
    newQueryName,
    databaseName: databaseName || undefined,
  });
