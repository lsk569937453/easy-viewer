import { v4 as uuid } from "uuid";
import type { ExeSqlResponse } from "../../types/backend";
import type { EditableRow } from "./types";

export interface LoadedTableRows {
  columnHeaders: string[];
  rows: EditableRow[];
}

/**
 * `exe_sql` 结果 → 可编辑行。纯映射：主键列存在时沿用原值，
 * 否则用注入的 `createId` 生成前端唯一 id（便于测试替换 uuid）。
 */
export function mapExeSqlResponse(
  payload: ExeSqlResponse,
  createId: () => string = uuid,
): LoadedTableRows {
  const columnHeaders = payload.header.map((col) => col.name);

  const rows: EditableRow[] = payload.rows.map((row) => {
    const rowObject: EditableRow = { id: "" };
    columnHeaders.forEach((headerName, index) => {
      rowObject[headerName] = row[index] ?? null;
    });
    rowObject.id = rowObject.id || createId(); // 使用 uuid 生成唯一ID
    return rowObject;
  });

  return { columnHeaders, rows };
}
