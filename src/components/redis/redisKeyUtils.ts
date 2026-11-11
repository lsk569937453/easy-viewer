import type { RedisCommandResponse } from "../../types/backend";
import { parseBaseResponse } from "../../utils/backendResponse";
import type { StatusTone } from "../ui/StatusChip";

export const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export interface RedisTypeMeta {
  label: string;
  tone: StatusTone;
}

const TYPE_META: Record<string, RedisTypeMeta> = {
  string: { label: "字符串", tone: "info" },
  hash: { label: "哈希", tone: "success" },
  list: { label: "列表", tone: "warning" },
  set: { label: "集合", tone: "neutral" },
  zset: { label: "有序集合", tone: "info" },
};

export const getTypeMeta = (type: string | null): RedisTypeMeta =>
  (type ? TYPE_META[type] : undefined) ?? {
    label: type || "未知",
    tone: "neutral",
  };

/** 键值内容/单元格的 JSON 美化；非对象 JSON 返回 null，由调用方按纯文本展示。 */
export const formatJsonValue = (value: string): string | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // 非 JSON，按纯文本展示
  }
  return null;
};

export const parseRedisCommandResponse = (
  responseJson: string,
): RedisCommandResponse | null => {
  try {
    const { response_code, response_msg } =
      parseBaseResponse<RedisCommandResponse>(responseJson);
    if (response_code === 0) {
      return response_msg;
    }
  } catch {
    // 解析失败时按"无结果"处理，由调用方保留原状态
  }
  return null;
};
