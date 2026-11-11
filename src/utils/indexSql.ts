import type { ExeSqlResponse } from "../types/backend";

/** 索引列信息查询（MySQL information_schema.STATISTICS）。 */
export function generateIndexColumnsQuery(
  tableName: string,
  indexName: string,
): string {
  return `
          SELECT
            COLUMN_NAME as column_name,
            SEQ_IN_INDEX as seq_in_index,
            COLLATION as collation,
            CARDINALITY as cardinality,
            SUB_PART as sub_part,
            NULLABLE as nullable
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${indexName}'
          ORDER BY SEQ_IN_INDEX
        `;
}

/** 由 information_schema 直接拼出该索引的 CREATE INDEX 语句。 */
export function generateIndexCreateSqlQuery(
  tableName: string,
  indexName: string,
): string {
  return `
          SELECT
            CONCAT(
              'CREATE ',
              IF(NON_UNIQUE = 1, '', 'UNIQUE '),
              'INDEX \`', INDEX_NAME, '\`',
              ' ON \`', TABLE_NAME, '\`',
              ' (', GROUP_CONCAT(\`COLUMN_NAME\` ORDER BY SEQ_IN_INDEX SEPARATOR ', '), ')',
              IF(INDEX_TYPE = 'FULLTEXT', CONCAT(' FULLTEXT'), ''),
              IF(INDEX_TYPE = 'HASH', CONCAT(' USING HASH'), ''),
              IF(INDEX_TYPE = 'BTREE', CONCAT(' USING BTREE'), '')
            ) as create_sql
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${indexName}'
          GROUP BY INDEX_NAME, INDEX_TYPE, NON_UNIQUE, TABLE_NAME
        `;
}

/** 索引基本信息查询。 */
export function generateIndexInfoQuery(
  tableName: string,
  indexName: string,
): string {
  return `
          SELECT DISTINCT
            INDEX_NAME as index_name,
            INDEX_TYPE as index_type,
            NON_UNIQUE as non_unique,
            TABLE_NAME as table_name
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${indexName}'
          LIMIT 1
        `;
}

/** 索引列行 → 展示模型（原 IndexDetailPage 内联映射）。 */
export interface IndexColumn {
  columnName: string;
  seqInIndex: string | number;
  collation: string;
  cardinality: string | number;
  subPart: string | null;
  nullable: string;
}

export interface IndexInfo {
  name: string;
  type: string;
  nonUnique: boolean;
  tableName: string;
}

export const mapIndexColumnRows = (rows: (string | null)[][]): IndexColumn[] =>
  rows.map((row) => ({
    columnName: row[0] || "",
    seqInIndex: row[1] || 0,
    collation: row[2] || "",
    cardinality: row[3] || 0,
    subPart: row[4] || null,
    nullable: row[5] || "YES",
  }));

export const mapIndexInfoRow = (
  row: (string | null)[],
  fallback: { name: string; tableName: string },
): IndexInfo => ({
  name: row[0] || fallback.name,
  type: row[1] || "",
  // 后端行值统一为字符串；原实现 `=== 1` 与字符串比较恒为 false，保持既有行为
  nonUnique: false,
  tableName: row[3] || fallback.tableName,
});

/** 从 exe_sql 响应里取首行，供 create SQL / 基本信息两处复用。 */
export const firstRowOf = (
  response: ExeSqlResponse,
): (string | null)[] | undefined => response.rows[0];
