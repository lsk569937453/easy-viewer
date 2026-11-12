import type { BackendErrorInfo } from "../types/backend";
import { parseBaseResponse } from "../utils/backendResponse";
import { BACKEND_COMMANDS, callBackend } from "./client";

/** 后端按方言生成的 DDL 向导文本。 */
export interface DdlTemplate {
  createTable: string;
  addColumn: string;
  createIndex: string;
}

const unwrap = <T>(raw: string): T => {
  const parsed = parseBaseResponse<T>(raw);
  if (parsed.response_code === 1) {
    throw new Error(backendErrorText(parsed.error, parsed.response_msg));
  }
  return parsed.response_msg;
};

/**
 * 错误信封转展示文案：有结构化 `error` 时优先用其中的中文 message，
 * 否则退回旧的字符串载荷。`code` 只在开发期拼进去，方便对日志定位。
 */
export const backendErrorText = (
  error: BackendErrorInfo | undefined,
  fallback: string,
): string => {
  if (!error) {
    return fallback;
  }
  return import.meta.env.DEV
    ? `${error.message}（${error.code}）`
    : error.message;
};

/**
 * 取某个数据源的 DDL 向导模板。
 *
 * 生成逻辑在后端 `sql/dialect.rs`，前端不再维护第二份方言模板；
 * 输出与历史 `utils/SqlUtils.ts` 逐字一致。
 */
export const fetchDdlTemplate = async (
  dbType: string,
  tableName: string,
): Promise<DdlTemplate> => {
  const raw = await callBackend<string>(BACKEND_COMMANDS.getDdlTemplate, {
    databaseType: dbType,
    tableName,
  });
  return unwrap<DdlTemplate>(raw);
};
