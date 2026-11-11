import { describe, expect, it } from "vitest";
import { buildChangeSqls, quoteSqlValue } from "./changeSql";
import type { EditableRow } from "./types";

describe("quoteSqlValue", () => {
  it("null/undefined 输出 NULL，其余转义单引号", () => {
    expect(quoteSqlValue(null)).toBe("NULL");
    expect(quoteSqlValue(undefined)).toBe("NULL");
    expect(quoteSqlValue("O'Reilly")).toBe("'O''Reilly'");
    expect(quoteSqlValue("")).toBe("''");
  });
});

describe("buildChangeSqls", () => {
  it("新增行生成 INSERT，并跳过 null/空串列", () => {
    const tableData: EditableRow[] = [
      { id: "row-1", pk: null, name: "O'Reilly", note: "" },
    ];

    expect(
      buildChangeSqls("users", ["pk", "name", "note"], tableData, []),
    ).toEqual(["INSERT INTO `users` (`name`) VALUES ('O''Reilly')"]);
  });

  it("修改行生成 UPDATE，变更值为 null 时写 NULL", () => {
    const original: EditableRow[] = [
      { id: "row-1", pk: "1", name: "old", note: "keep" },
    ];
    const current: EditableRow[] = [
      { id: "row-1", pk: "1", name: null, note: "keep" },
    ];

    expect(
      buildChangeSqls("users", ["pk", "name", "note"], current, original),
    ).toEqual(["UPDATE `users` SET `name` = NULL WHERE `pk` = '1'"]);
  });

  it("没有 diff 时返回空数组", () => {
    const rows: EditableRow[] = [{ id: "row-1", pk: "1", name: "same" }];

    expect(buildChangeSqls("users", ["pk", "name"], rows, rows)).toEqual([]);
  });

  it("新增行所有列都为空时不生成 SQL", () => {
    const tableData: EditableRow[] = [{ id: "row-1", pk: null, name: "" }];

    expect(buildChangeSqls("users", ["pk", "name"], tableData, [])).toEqual([]);
  });
});
