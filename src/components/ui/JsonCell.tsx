const DEFAULT_PRE_CLASS =
  "max-w-md whitespace-pre-wrap break-all rounded bg-base-200 p-1.5 font-mono text-xs";
const DEFAULT_TEXT_CLASS = "font-mono text-xs";

export interface JsonCellProps {
  value: string | null | undefined;
  /** 非 JSON 长文本截断阈值；省略或 <=0 表示不截断 */
  maxLength?: number;
  /** JSON 块样式覆盖（默认与 Elasticsearch 面板一致） */
  preClassName?: string;
  /** 纯文本样式覆盖 */
  textClassName?: string;
  /** 空值占位文案，默认 `-` */
  placeholder?: string;
  /** 阻止点击事件冒泡（表格行点击场景） */
  stopPropagation?: boolean;
}

/**
 * JSON / 长文本单元格渲染。原 Elasticsearch、Redis 键详情、Kafka/RocketMQ 消息、
 * Redis 控制台共 4 处同形实现，这里统一为一份。
 */
function JsonCell({
  value,
  maxLength,
  preClassName,
  textClassName,
  placeholder = "-",
  stopPropagation = false,
}: JsonCellProps) {
  if (value === null || value === undefined) {
    return <span>{placeholder}</span>;
  }

  const isJsonLike =
    typeof value === "string" &&
    (value.startsWith("{") || value.startsWith("["));

  if (isJsonLike) {
    try {
      const parsed: unknown = JSON.parse(value);
      return (
        <pre
          className={preClassName ?? DEFAULT_PRE_CLASS}
          onClick={
            stopPropagation ? (event) => event.stopPropagation() : undefined
          }
        >
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // 非法 JSON 继续按纯文本展示
    }
  }

  if (
    typeof maxLength === "number" &&
    maxLength > 0 &&
    value.length > maxLength
  ) {
    return (
      <span className={textClassName ?? DEFAULT_TEXT_CLASS} title={value}>
        {value.substring(0, maxLength)}...
      </span>
    );
  }

  return <span className={textClassName ?? DEFAULT_TEXT_CLASS}>{value}</span>;
}

export default JsonCell;
