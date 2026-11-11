import { describe, expect, it } from "vitest";
import { formatMessageTimestamp } from "./messageConfigs";

describe("formatMessageTimestamp", () => {
  it("毫秒时间戳可格式化", () => {
    const formatted = formatMessageTimestamp("1700000000000");

    expect(formatted).not.toBe("-");
    expect(formatted).toMatch(/\d{4}/);
  });

  it("ISO 字符串可格式化", () => {
    expect(formatMessageTimestamp("2024-01-02T03:04:05Z")).toMatch(/2024/);
  });

  it("空值返回占位符", () => {
    expect(formatMessageTimestamp("")).toBe("-");
  });

  it("无法解析时原样返回", () => {
    expect(formatMessageTimestamp("not-a-date")).toBe("not-a-date");
  });
});
