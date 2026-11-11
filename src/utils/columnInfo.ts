import type { ShowColumnHeader } from "../types/backend";
import type { TreeNode } from "../types/tree";

/** 列名在不同数据库的 header 名（MySQL: Field，PostgreSQL: column_name，SQLite: name）。 */
const NAME_HEADER_KEYS = ["field", "name", "column_name"];

export type ColumnCell = string | null;
export type ColumnRow = ColumnCell[];

/** 列详情视图使用的数据形状（原 ColumnDetailPage 内部接口，迁出以便单测）。 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: string | null;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  extra: string | null;
  tableName: string;
  rawInfo: Record<string, string> | null;
}

/** 表详情「列信息」页签的行形状（沿用原 TableDetailPage 的固定索引映射）。 */
export interface TableColumnRow {
  name: string;
  type: string;
  isNullable: string;
  isPrimaryKey: string;
  defaultValue: string;
}

export const findColumnNameIndex = (headers: ShowColumnHeader[]): number =>
  headers.findIndex((header) =>
    NAME_HEADER_KEYS.includes(header.name.toLowerCase()),
  );

export const matchColumnRow = (
  headers: ShowColumnHeader[],
  rows: ColumnRow[],
  columnName: string,
): ColumnRow | undefined => {
  const nameIndex = findColumnNameIndex(headers);
  if (nameIndex < 0) return undefined;
  return rows.find((row) => row[nameIndex] === columnName);
};

/** 把匹配行展开成 `{ header: value }`，缺失单元格记为 "NULL"（沿用原行为）。 */
export const buildRawColumnInfo = (
  headers: ShowColumnHeader[],
  row: ColumnRow,
): Record<string, string> => {
  const info: Record<string, string> = {};
  headers.forEach((header, index) => {
    info[header.name] = row[index] ?? "NULL";
  });
  return info;
};

/** 按候选 key 大小写不敏感地取原始列字段。 */
export const readColumnField = (
  info: Record<string, string>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const found = Object.keys(info).find(
      (header) => header.toLowerCase() === key.toLowerCase(),
    );
    if (found) return info[found];
  }
  return null;
};

const resolveTableName = (node: TreeNode, tableName?: string): string =>
  tableName || node.path[node.path.length - 3]?.config_value || "";

/**
 * 由「show_columns 结果 + 树节点」构造列详情。
 * 命中行时优先用返回字段，未命中时用节点描述兜底（原两段分支逻辑等价搬移）。
 */
export const buildColumnInfo = ({
  node,
  tableName,
  headers = [],
  row,
}: {
  node: TreeNode;
  tableName?: string;
  /** 仅在命中行时需要 */
  headers?: ShowColumnHeader[];
  row?: ColumnRow;
}): ColumnInfo => {
  const resolvedTableName = resolveTableName(node, tableName);

  if (!row) {
    return {
      name: node.name,
      type: node.description || "未知",
      nullable: "",
      defaultValue: "",
      isPrimaryKey: node.iconName === "primary",
      extra: "",
      tableName: resolvedTableName,
      rawInfo: null,
    };
  }

  const info = buildRawColumnInfo(headers, row);
  const isPrimaryKey =
    node.iconName === "primary" ||
    readColumnField(info, ["key"]) === "PRI" ||
    readColumnField(info, ["pk"]) === "1";

  return {
    name: node.name,
    type:
      readColumnField(info, ["type", "column_type", "data_type"]) ||
      node.description ||
      "",
    nullable: readColumnField(info, ["null", "is_nullable", "nullable"]) || "",
    defaultValue:
      readColumnField(info, ["default", "column_default", "dflt_value"]) || "",
    isPrimaryKey,
    extra: readColumnField(info, ["extra", "column_comment", "comment"]) || "",
    tableName: resolvedTableName,
    rawInfo: info,
  };
};

/**
 * TableDetailPage「列信息」的固定索引映射。
 * 索引按 MySQL `show_columns` 返回顺序：0=cid, 1=name, 2=type, 3=notnull,
 * 4=default, 5=pk —— 原实现有同样注释，这里只搬移不改语义。
 *
 * 注意：原实现注释写 `notnull: 0 -> YES, 1 -> NO`，但代码是 `=== "1" ? "YES" : "NO"`
 * （与注释相反）。后端 show_columns 的 header 顺序未在本仓库内确证，
 * 为避免改变线上展示，本次保持代码行为并记录该矛盾。
 */
export const mapTableColumnRows = (rows: ColumnRow[]): TableColumnRow[] =>
  rows.map((row) => ({
    name: row[1] ?? "",
    type: row[2] ?? "",
    isNullable: row[3] === "1" ? "YES" : "NO",
    isPrimaryKey: row[5] === "1" ? "YES" : "NO",
    defaultValue: row[4] != null ? String(row[4]) : "NULL",
  }));
