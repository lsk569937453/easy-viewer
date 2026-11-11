import { COMMON_COMMANDS } from "./consoleConfig";

export interface CommandHelpPanelProps {
  open: boolean;
}

/** 常用 Redis 命令帮助面板。 */
export function CommandHelpPanel({ open }: CommandHelpPanelProps) {
  if (!open) return null;

  return (
    <div className="flex-shrink-0 border-b border-hairline bg-base-200/30 px-3 py-2">
      <h3 className="mb-1.5 text-xs font-medium text-base-content/70">
        常用 Redis 命令
      </h3>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-micro md:grid-cols-2">
        {COMMON_COMMANDS.map((item) => (
          <div key={item.cmd} className="flex min-w-0 gap-2">
            <code className="flex-shrink-0 font-mono text-primary">
              {item.cmd}
            </code>
            <span className="truncate text-base-content/60">{item.desc}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 text-micro text-base-content/45">
        <p>按 Enter 执行命令，↑↓ 浏览历史，ESC 清空输入</p>
        <p>支持引号内的空格，如 SET key "hello world"</p>
        <p>FLUSHALL、FLUSHDB、SHUTDOWN 会弹出二次确认</p>
      </div>
    </div>
  );
}
