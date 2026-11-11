import { describe, expect, it } from "vitest";
import type { SqlHeader } from "../../types/backend";
import {
  buildDocument,
  totalPagesOf,
  toZeroBasedPage,
} from "./esDocumentModel";

const headers: SqlHeader[] = [
  { name: "_id", type_name: "text", is_primary_key: true },
  { name: "meta", type_name: "text", is_primary_key: false },
  { name: "note", type_name: "text", is_primary_key: false },
];

describe("buildDocument", () => {
  it("合法 JSON 单元格解析为对象，非法 JSON 保留原始字符串", () => {
    const doc = buildDocument(["1", '{"a":1}', "{not json"], headers);

    expect(doc._id).toBe(1);
    expect(doc.meta).toEqual({ a: 1 });
    expect(doc.note).toBe("{not json");
  });

  it("null / undefined / 越界单元格不写入文档", () => {
    const doc = buildDocument([null, "x"], headers);

    expect(doc).toEqual({ meta: "x" });
    expect(Object.keys(doc)).toHaveLength(1);
  });

  it("空行与空表头返回空对象", () => {
    expect(buildDocument([], headers)).toEqual({});
    expect(buildDocument(["1"], [])).toEqual({});
  });
});

describe("toZeroBasedPage", () => {
  it("1 基页码转 0 基页码", () => {
    expect(toZeroBasedPage(1)).toBe(0);
    expect(toZeroBasedPage(3)).toBe(2);
  });

  it("0 与负数归零", () => {
    expect(toZeroBasedPage(0)).toBe(0);
    expect(toZeroBasedPage(-2)).toBe(0);
  });
});

describe("totalPagesOf", () => {
  it("按页大小向上取整", () => {
    expect(totalPagesOf(0, 50)).toBe(0);
    expect(totalPagesOf(50, 50)).toBe(1);
    expect(totalPagesOf(51, 50)).toBe(2);
  });
});
