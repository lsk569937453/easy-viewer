import type { StatusTone } from "../ui/StatusChip";

export interface UploadResult {
  tone: "success" | "warning";
  text: string;
}

export interface UploadStatusInput {
  isUploading: boolean;
  error: string | null;
  result: UploadResult | null;
}

export interface UploadStatus {
  text: string;
  tone: StatusTone;
}

/** 进度百分比：分母为 0 时按 0%（与拆分前的三元表达式一致）。 */
export const computePercent = (done: number, total: number): number =>
  total > 0 ? Math.round((done / total) * 100) : 0;

/** 页头状态胶囊：上传中 > 失败 > 有结果 > 待上传。 */
export const resolveUploadStatus = ({
  isUploading,
  error,
  result,
}: UploadStatusInput): UploadStatus => ({
  text: isUploading
    ? "上传中"
    : error
      ? "上传失败"
      : result
        ? result.tone === "success"
          ? "已完成"
          : "已结束"
        : "待上传",
  tone: isUploading
    ? "info"
    : error
      ? "error"
      : result
        ? result.tone
        : "neutral",
});
