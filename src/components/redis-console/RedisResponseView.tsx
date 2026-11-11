import type { RedisCommandResponse } from "../../types/backend";

export interface RedisResponseViewProps {
  response?: RedisCommandResponse;
}

/**
 * 单条 Redis 命令响应渲染。拆分前是 RedisConsolePanel 内的 formatResponse，
 * 各响应类型的分支、文案与样式（含 timeHint）完全保留。
 */
export function RedisResponseView({ response }: RedisResponseViewProps) {
  if (!response) return null;

  const { response_type, value, array_items, execution_time_ms } = response;

  const timeHint = (
    <span className="ml-2 text-micro text-base-content/40">
      {execution_time_ms}ms
    </span>
  );

  switch (response_type) {
    case "nil":
      return (
        <div>
          <span className="text-base-content/40">（空）</span>
          {timeHint}
        </div>
      );
    case "integer":
      return (
        <div>
          <span className="text-info">（整数）{value}</span>
          {timeHint}
        </div>
      );
    case "string": {
      let displayValue = value ?? "";
      let isJson = false;
      try {
        JSON.parse(displayValue);
        isJson = true;
      } catch {
        // 非 JSON
      }

      if (isJson) {
        try {
          displayValue = JSON.stringify(JSON.parse(displayValue), null, 2);
        } catch {
          // 格式化失败时保留原文
        }
      }

      return (
        <div>
          <pre
            className={`whitespace-pre-wrap break-all text-success ${
              isJson ? "rounded-[var(--radius-control)] bg-base-200/60 p-2" : ""
            }`}
          >
            "{displayValue}"
          </pre>
          {timeHint}
        </div>
      );
    }
    case "ok":
      return (
        <div>
          <span className="text-warning">OK</span>
          {timeHint}
        </div>
      );
    case "status":
      return (
        <div>
          <span className="text-warning">{value}</span>
          {timeHint}
        </div>
      );
    case "array":
      return (
        <div>
          {array_items && array_items.length > 0 ? (
            <div>
              {array_items.map((item, index) => (
                <div key={index} className="break-all font-mono">
                  <span className="text-base-content/50">{index + 1})</span>{" "}
                  <span>{item}</span>
                </div>
              ))}
              <span className="text-micro text-base-content/40">
                （{array_items.length} 个元素）
              </span>
              {timeHint}
            </div>
          ) : (
            <div>
              <span className="text-base-content/40">（空数组）</span>
              {timeHint}
            </div>
          )}
        </div>
      );
    case "error":
      return (
        <div>
          <span className="text-error">{value}</span>
          {timeHint}
        </div>
      );
    default:
      return (
        <div>
          <span className="text-base-content/60">
            （未知响应类型）{value || ""}
          </span>
          {timeHint}
        </div>
      );
  }
}
