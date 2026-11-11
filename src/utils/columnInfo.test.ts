import { describe, expect, it } from "vitest";
import type { ShowColumnHeader } from "../types/backend";
import type { TreeNode } from "../types/tree";
import {
  buildColumnInfo,
  buildRawColumnInfo,
  findColumnNameIndex,
  mapTableColumnRows,
  matchColumnRow,
  readColumnField,
} from "./columnInfo";

const headers: ShowColumnHeader[] = [
  { name: "Field", type_name: "varchar" },
  { name: "Type", type_name: "varchar" },
  { name: "Null", type_name: "varchar" },
  { name: "Key", type_name: "varchar" },
  { name: "Default", type_name: "varchar" },
  { name: "Extra", type_name: "varchar" },
];

const makeNode = (overrides: Partial<TreeNode> = {}): TreeNode => ({
  id: "1/docs/users/id",
  name: "id",
  type: "default",
  path: [
    { level: 1, config_value: "1" },
    { level: 2, config_value: "docs" },
    { level: 3, config_value: "users" },
    { level: 4, config_value: "id" },
  ],
  ...overrides,
});

describe("findColumnNameIndex / matchColumnRow", () => {
  it("识别 Field / name / column_name 三种列名 header", () => {
    expect(findColumnNameIndex(headers)).toBe(0);
    expect(
      findColumnNameIndex([{ name: "column_name", type_name: "text" }]),
    ).toBe(0);
    expect(
      findColumnNameIndex([{ name: "unrelated", type_name: "text" }]),
    ).toBe(-1);
  });

  it("按列名匹配行，找不到返回 undefined", () => {
    const rows = [["id", "int", "NO", "PRI", "NULL", "auto_increment"]];
    expect(matchColumnRow(headers, rows, "id")).toEqual(rows[0]);
    expect(matchColumnRow(headers, rows, "missing")).toBeUndefined();
  });
});

describe("buildRawColumnInfo / readColumnField", () => {
  it("缺失单元格记为 NULL", () => {
    expect(buildRawColumnInfo(headers.slice(0, 2), ["a", null])).toEqual({
      Field: "a",
      Type: "NULL",
    });
  });

  it("候选 key 大小写不敏感", () => {
    expect(readColumnField({ Key: "PRI" }, ["key"])).toBe("PRI");
    expect(readColumnField({}, ["key"])).toBeNull();
  });
});

describe("buildColumnInfo", () => {
  it("命中行时使用返回字段并识别主键", () => {
    const info = buildColumnInfo({
      node: makeNode(),
      headers,
      row: ["id", "int", "NO", "PRI", "NULL", "auto_increment"],
    });

    expect(info.name).toBe("id");
    expect(info.type).toBe("int");
    expect(info.nullable).toBe("NO");
    expect(info.isPrimaryKey).toBe(true);
    expect(info.extra).toBe("auto_increment");
    // path 倒数第三段（4 段 path 时为第 2 段），沿用原实现行为
    expect(info.tableName).toBe("docs");
    expect(info.rawInfo).not.toBeNull();
  });

  it("未命中行时用节点描述兜底", () => {
    const info = buildColumnInfo({
      node: makeNode({ description: "varchar(32)", iconName: "primary" }),
      tableName: "users",
    });

    expect(info.type).toBe("varchar(32)");
    expect(info.isPrimaryKey).toBe(true);
    expect(info.rawInfo).toBeNull();
    expect(info.tableName).toBe("users");
  });
});

describe("mapTableColumnRows", () => {
  it("按固定索引映射列名/类型/可空/主键/默认值", () => {
    expect(mapTableColumnRows([["0", "id", "int", "1", null, "1"]])).toEqual([
      {
        name: "id",
        type: "int",
        // 原实现为 `row[3] === "1" ? "YES" : "NO"`（与其注释相反），此处锁定既有行为
        isNullable: "YES",
        isPrimaryKey: "YES",
        defaultValue: "NULL",
      },
    ]);
  });
});
