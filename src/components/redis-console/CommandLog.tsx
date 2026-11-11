import type { RefObject } from "react";
import { FaTerminal } from "react-icons/fa";
import { EmptyState } from "../ui/states";
import type { ConsoleEntry } from "./consoleConfig";
import { RedisResponseView } from "./RedisResponseView";

export interface CommandLogProps {
  entries: ConsoleEntry[];
  outputEndRef: RefObject<HTMLDivElement | null>;
}

/** 命令输出区：空态提示 + 历史条目列表 + 自动滚动锚点。 */
export function CommandLog({ entries, outputEndRef }: CommandLogProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="命令输出"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-base-300/20 p-3 font-mono text-xs"
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={<FaTerminal size="1.5em" aria-hidden="true" />}
          title="还没有执行过命令"
          description="在下方输入 Redis 命令并回车，例如 PING。"
        />
      ) : (
        <div className="space-y-3">
          {entries.map((item, index) => (
            <div
              key={index}
              className="border-l-2 border-hairline pl-3 transition-colors hover:border-primary/30"
            >
              <div className="mb-1 flex items-center gap-1.5 text-micro text-base-content/45">
                <span className="tabular-nums">{item.timestamp}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{item.duration}ms</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-primary" aria-hidden="true">
                  &gt;
                </span>
                <span className="break-all text-base-content">
                  {item.command}
                </span>
              </div>
              <div className="ml-3 mt-1">
                {item.error ? (
                  <div className="break-all text-error">{item.error}</div>
                ) : (
                  <RedisResponseView response={item.response} />
                )}
              </div>
            </div>
          ))}
          <div ref={outputEndRef} />
        </div>
      )}
    </div>
  );
}
