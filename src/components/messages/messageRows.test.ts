import { describe, expect, it } from "vitest";
import { filterMessages, type MessageFilterOptions } from "./messageRows";

const ROWS: (string | null)[][] = [
  ["0", "alpha", null],
  ["1", "Beta", "x"],
  ["1", "gamma", "y"],
];

const NO_FILTER: MessageFilterOptions = {
  searchTerm: "",
  partitionFilter: "all",
  supportsPartitionFilter: true,
};

describe("filterMessages", () => {
  it("无过滤条件时原样返回所有行", () => {
    expect(filterMessages(ROWS, NO_FILTER)).toEqual(ROWS);
  });

  it("按分区过滤只保留第 0 列匹配的行", () => {
    expect(
      filterMessages(ROWS, { ...NO_FILTER, partitionFilter: "1" }),
    ).toEqual([ROWS[1], ROWS[2]]);
  });

  it("不支持分区过滤时忽略分区值", () => {
    expect(
      filterMessages(ROWS, {
        ...NO_FILTER,
        partitionFilter: "1",
        supportsPartitionFilter: false,
      }),
    ).toEqual(ROWS);
  });

  it("搜索词大小写不敏感、跨列匹配，null 单元格按空串处理", () => {
    expect(filterMessages(ROWS, { ...NO_FILTER, searchTerm: "beta" })).toEqual([
      ROWS[1],
    ]);
    expect(
      filterMessages(ROWS, { ...NO_FILTER, searchTerm: "0 alpha" }),
    ).toEqual([ROWS[0]]);
  });

  it("无命中时返回空数组", () => {
    expect(filterMessages(ROWS, { ...NO_FILTER, searchTerm: "zzz" })).toEqual(
      [],
    );
  });
});
