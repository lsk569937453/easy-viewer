/**
 * Kafka / RocketMQ 消息面板的差异配置。
 * 两个面板的结构完全一样，只有"元数据字段名、正文列名、时间列名"
 * 不同，因此收敛成一份配置（AGENTS.md：禁止复制大块雷同代码）。
 * 发送命令由 `metaField` 在 `services/kafka.ts` 的 sendMessage 内统一映射，
 * 不再单独登记 sendCommand，避免同一映射存在两处来源。
 */
export interface MessagePanelConfig {
  /** 面板标签（显示在页头） */
  label: string;
  /** 元数据字段名：Kafka 用 key，RocketMQ 用 tag */
  metaField: "key" | "tag";
  /** 元数据输入框标签与占位符 */
  metaLabel: string;
  metaPlaceholder: string;
  /** 正文列名（命中则尝试 JSON 格式化） */
  bodyHeader: string;
  /** 时间列名（命中则本地化展示） */
  timeHeader: string;
  /** 是否支持按分区过滤 */
  supportsPartitionFilter: boolean;
  /** 无消息时的引导文案 */
  emptyHint: string;
}

/** 时间戳统一格式：秒/毫秒数字或 ISO 字符串都能处理 */
export const formatMessageTimestamp = (timestampStr: string): string => {
  if (!timestampStr) return "-";
  const numeric = Number(timestampStr);
  const date = new Date(Number.isNaN(numeric) ? timestampStr : numeric);
  if (Number.isNaN(date.getTime())) return timestampStr;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const KAFKA_MESSAGE_CONFIG: MessagePanelConfig = {
  label: "Kafka",
  metaField: "key",
  metaLabel: "Key",
  metaPlaceholder: "例如：user-id-123",
  bodyHeader: "Value",
  timeHeader: "Timestamp",
  supportsPartitionFilter: true,
  emptyHint: "点击右上角「发送消息」生产第一条消息。",
};

export const ROCKETMQ_MESSAGE_CONFIG: MessagePanelConfig = {
  label: "RocketMQ",
  metaField: "tag",
  metaLabel: "Tag",
  metaPlaceholder: "例如：order_created",
  bodyHeader: "Body",
  timeHeader: "BornTimestamp",
  supportsPartitionFilter: false,
  emptyHint: "点击右上角「发送消息」投递第一条消息。",
};
