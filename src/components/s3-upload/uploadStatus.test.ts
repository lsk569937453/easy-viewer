import { describe, expect, it } from "vitest";
import { computePercent, resolveUploadStatus } from "./uploadStatus";

describe("computePercent", () => {
  it("分母为 0 时返回 0", () => {
    expect(computePercent(0, 0)).toBe(0);
    expect(computePercent(5, 0)).toBe(0);
  });

  it("按四舍五入换算百分比", () => {
    expect(computePercent(1, 4)).toBe(25);
    expect(computePercent(2, 3)).toBe(67);
    expect(computePercent(3, 3)).toBe(100);
  });
});

describe("resolveUploadStatus", () => {
  it("上传中优先于失败与结果", () => {
    expect(
      resolveUploadStatus({
        isUploading: true,
        error: "网络中断",
        result: { tone: "success", text: "文件上传成功" },
      }),
    ).toEqual({ text: "上传中", tone: "info" });
  });

  it("失败态优先于结果", () => {
    expect(
      resolveUploadStatus({
        isUploading: false,
        error: "网络中断",
        result: null,
      }),
    ).toEqual({ text: "上传失败", tone: "error" });
  });

  it("结果态与待上传态", () => {
    expect(
      resolveUploadStatus({
        isUploading: false,
        error: null,
        result: { tone: "success", text: "全部 2 个文件上传成功" },
      }),
    ).toEqual({ text: "已完成", tone: "success" });
    expect(
      resolveUploadStatus({
        isUploading: false,
        error: null,
        result: { tone: "warning", text: "上传完成：1 个成功，1 个失败" },
      }),
    ).toEqual({ text: "已结束", tone: "warning" });
    expect(
      resolveUploadStatus({ isUploading: false, error: null, result: null }),
    ).toEqual({ text: "待上传", tone: "neutral" });
  });
});
