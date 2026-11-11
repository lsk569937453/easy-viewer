import { describe, expect, it } from "vitest";
import { formatBytes, formatTimestamp, formatTtl } from "./format";

describe("formatBytes", () => {
  it("空值与非法值返回占位符", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });

  it("0 字节与原 S3 实现一致", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("按 1024 进位并去掉多余小数零", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024 * 2)).toBe("2 MB");
  });

  it("超出 GB 时仍按 GB 展示", () => {
    expect(formatBytes(1024 ** 4)).toBe("1024 GB");
  });
});

describe("formatTtl", () => {
  it("特殊值映射为中文描述", () => {
    expect(formatTtl(null)).toBe("读取中…");
    expect(formatTtl(Number.NaN)).toBe("未知");
    expect(formatTtl(-1)).toBe("永不过期");
    expect(formatTtl(-2)).toBe("键不存在");
    expect(formatTtl(0)).toBe("已过期");
  });

  it("拆分天/时/分/秒", () => {
    expect(formatTtl(90)).toBe("剩余 1 分钟 30 秒");
    expect(formatTtl(3661)).toBe("剩余 1 小时 1 分钟 1 秒");
    expect(formatTtl(86400 + 60)).toBe("剩余 1 天 1 分钟");
  });
});

describe("formatTimestamp", () => {
  it("空值返回占位符", () => {
    expect(formatTimestamp(null)).toBe("-");
    expect(formatTimestamp("")).toBe("-");
  });

  it("数字时间戳与日期字符串都能解析", () => {
    expect(formatTimestamp(1700000000000)).toBe(
      new Date(1700000000000).toLocaleString(),
    );
    expect(formatTimestamp("2024-01-01T00:00:00Z")).toBe(
      new Date("2024-01-01T00:00:00Z").toLocaleString(),
    );
  });

  it("无法解析时原样返回", () => {
    expect(formatTimestamp("not-a-date")).toBe("not-a-date");
  });
});
