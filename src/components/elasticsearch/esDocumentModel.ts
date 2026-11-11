import type { SqlHeader } from "../../types/backend";

/**
 * 由表头与一行单元格值还原文档对象：单元格是合法 JSON 时取解析结果，
 * 否则保留原始字符串；null / undefined 单元格不进入文档。
 */
export const buildDocument = (
  row: (string | null)[],
  headers: SqlHeader[],
): Record<string, unknown> => {
  const doc: Record<string, unknown> = {};
  headers.forEach((header, cellIndex) => {
    const value = row[cellIndex];
    if (value !== null && value !== undefined) {
      try {
        doc[header.name] = JSON.parse(value);
      } catch {
        doc[header.name] = value;
      }
    }
  });
  return doc;
};

/** 1 基页码转 0 基页码（负值归零）。 */
export const toZeroBasedPage = (page: number): number => Math.max(0, page - 1);

/** 总页数：与原 `Math.ceil(totalCount / pageSize)` 完全一致。 */
export const totalPagesOf = (totalCount: number, pageSize: number): number =>
  Math.ceil(totalCount / pageSize);
