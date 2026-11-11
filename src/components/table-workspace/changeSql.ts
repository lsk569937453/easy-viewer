import type { EditableRow } from "./types";

/** SQL 字面量：`null`/`undefined` → NULL，其余按单引号转义。 */
export function quoteSqlValue(value: string | null | undefined): string {
  return value === null || value === undefined
    ? "NULL"
    : `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * 对比当前行与原始行，生成 UPDATE/INSERT SQL。
 * 逻辑与拆分前 `handleSaveChanges` 内联实现逐字一致。
 */
export function buildChangeSqls(
  tableName: string,
  columnHeaders: string[],
  tableData: EditableRow[],
  originalTableData: EditableRow[],
): string[] {
  const sqls: string[] = [];
  const idColumn = columnHeaders[0]; // 使用第一列作为标识列

  for (const current of tableData) {
    const original = originalTableData.find((o) => o.id === current.id);

    if (!original) {
      // 新增行：生成 INSERT SQL
      const columns: string[] = [];
      const values: string[] = [];
      columnHeaders.forEach((col) => {
        if (
          current[col] !== null &&
          current[col] !== undefined &&
          String(current[col]) !== ""
        ) {
          columns.push(`\`${col}\``);
          values.push(`'${String(current[col]).replace(/'/g, "''")}'`);
        }
      });
      if (columns.length > 0) {
        sqls.push(
          `INSERT INTO \`${tableName}\` (${columns.join(", ")}) VALUES (${values.join(", ")})`,
        );
      }
      continue;
    }

    const changes: string[] = [];
    columnHeaders.forEach((col) => {
      if (String(current[col]) !== String(original[col])) {
        changes.push(`\`${col}\` = ${quoteSqlValue(current[col])}`);
      }
    });

    if (changes.length > 0) {
      sqls.push(
        `UPDATE \`${tableName}\` SET ${changes.join(", ")} WHERE \`${idColumn}\` = ${quoteSqlValue(original[idColumn])}`,
      );
    }
  }

  return sqls;
}
