import { describe, expect, it } from "vitest";
import {
  firstRowOf,
  generateIndexColumnsQuery,
  generateIndexCreateSqlQuery,
  generateIndexInfoQuery,
  mapIndexColumnRows,
  mapIndexInfoRow,
} from "./indexSql";

describe("索引 SQL 构造", () => {
  it("三条查询都带表名与索引名过滤", () => {
    for (const query of [
      generateIndexColumnsQuery("users", "idx_name"),
      generateIndexCreateSqlQuery("users", "idx_name"),
      generateIndexInfoQuery("users", "idx_name"),
    ]) {
      expect(query).toContain("information_schema.STATISTICS");
      expect(query).toContain("TABLE_NAME = 'users'");
      expect(query).toContain("INDEX_NAME = 'idx_name'");
    }
  });

  it("创建 SQL 查询按 SEQ_IN_INDEX 聚合列名", () => {
    expect(generateIndexCreateSqlQuery("t", "i")).toContain(
      "GROUP_CONCAT(`COLUMN_NAME` ORDER BY SEQ_IN_INDEX",
    );
  });
});

describe("索引行映射", () => {
  it("列行缺失值走默认", () => {
    expect(mapIndexColumnRows([[null, null, null, null, null, null]])).toEqual([
      {
        columnName: "",
        seqInIndex: 0,
        collation: "",
        cardinality: 0,
        subPart: null,
        nullable: "YES",
      },
    ]);
  });

  it("基本信息行缺失时用兜底值，nonUnique 保持既有 false", () => {
    expect(
      mapIndexInfoRow([null, null, null, null], {
        name: "idx",
        tableName: "users",
      }),
    ).toEqual({ name: "idx", type: "", nonUnique: false, tableName: "users" });
  });

  it("firstRowOf 取首行", () => {
    expect(firstRowOf({ header: [], rows: [["a"], ["b"]] })).toEqual(["a"]);
    expect(firstRowOf({ header: [], rows: [] })).toBeUndefined();
  });
});
