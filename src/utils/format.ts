const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/**
 * 字节数格式化。原 S3 上传与 Redis 键信息各有一份实现，输出规则不一致
 * （`1 KB` vs `1.0 KB`），这里统一为「去掉多余的小数零」。
 * 空值/非法值统一返回 `—`。
 */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return "—";
  const value = Number(bytes);
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0 B";

  const unitIndex = Math.min(
    BYTE_UNITS.length - 1,
    Math.floor(Math.log(Math.abs(value)) / Math.log(1024)),
  );
  const scaled = value / 1024 ** unitIndex;
  const text = Number.parseFloat(scaled.toFixed(unitIndex === 0 ? 0 : 1));
  return `${text} ${BYTE_UNITS[unitIndex]}`;
};

/** Redis TTL 秒数 → 中文剩余时长描述。 */
export const formatTtl = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "读取中…";
  const total = Number(seconds);
  if (!Number.isFinite(total)) return "未知";
  if (total === -1) return "永不过期";
  if (total === -2) return "键不存在";
  if (total <= 0) return "已过期";

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} 秒`);

  return `剩余 ${parts.join(" ")}`;
};

/** 毫秒/秒时间戳（或可解析的日期字符串）→ 本地化时间文本。 */
export const formatTimestamp = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== "") {
    return new Date(numeric).toLocaleString();
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};
