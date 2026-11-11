import { describe, expect, it } from "vitest";
import type { SqlHeader } from "../../types/backend";
import { mapExeSqlResponse } from "./tableRows";

const header = (name: string): SqlHeader => ({
  name,
  type_name: "VARCHAR",
  is_primary_key: false,
});

describe("mapExeSqlResponse", () => {
  it("按表头顺序映射行，缺失值补 null，保留真实主键 id", () => {
    const { columnHeaders, rows } = mapExeSqlResponse(
      {
        header: [header("id"), header("name")],
        rows: [["7", null]],
      },
      () => "generated",
    );

    expect(columnHeaders).toEqual(["id", "name"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("7");
    expect(rows[0].name).toBeNull();
  });

  it("表头没有 id 列时用注入的 createId 生成前端唯一 id", () => {
    let calls = 0;
    const { rows } = mapExeSqlResponse(
      { header: [header("name")], rows: [["Alice"], ["Bob"]] },
      () => {
        calls += 1;
        return `row-${calls}`;
      },
    );

    expect(rows.map((row) => row.id)).toEqual(["row-1", "row-2"]);
    expect(rows[0].name).toBe("Alice");
  });

  it("空结果返回空列与空行", () => {
    const { columnHeaders, rows } = mapExeSqlResponse({
      header: [],
      rows: [],
    });

    expect(columnHeaders).toEqual([]);
    expect(rows).toEqual([]);
  });
});
