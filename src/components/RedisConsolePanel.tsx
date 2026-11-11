import { invoke } from "@tauri-apps/api/core";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaTerminal } from "react-icons/fa";
import { IoHelpCircleOutline, IoSend, IoTrashOutline } from "react-icons/io5";
import type { ConnectionSummary, RedisCommandResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import ActionButton from "./ui/ActionButton";
import ConfirmDialog from "./ui/ConfirmDialog";
import PageHeader from "./ui/PageHeader";
import StatusChip from "./ui/StatusChip";
import { EmptyState } from "./ui/states";
import Toolbar from "./ui/Toolbar";

interface ConsoleEntry {
  command: string;
  response?: RedisCommandResponse;
  error?: string;
  timestamp: string;
  duration: number;
}

interface RedisConsolePanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

/** 需要二次确认的危险命令 */
const DANGEROUS_COMMANDS = ["FLUSHALL", "FLUSHDB", "SHUTDOWN"];

const COMMON_COMMANDS = [
  { cmd: "PING", desc: "测试连接" },
  { cmd: "SET key value", desc: "设置键值" },
  { cmd: "GET key", desc: "获取键值" },
  { cmd: "DEL key", desc: "删除键" },
  { cmd: "DBSIZE", desc: "获取数据库大小" },
  { cmd: "KEYS pattern", desc: "查找键（如 KEYS *）" },
  { cmd: "HSET key field value", desc: "设置哈希字段" },
  { cmd: "HGETALL key", desc: "获取哈希所有字段" },
  { cmd: "LPUSH key value", desc: "列表左侧推入" },
  { cmd: "LRANGE key 0 -1", desc: "获取列表所有元素" },
  { cmd: "SADD key member", desc: "集合添加成员" },
  { cmd: "SMEMBERS key", desc: "获取集合所有成员" },
  { cmd: "ZADD key score member", desc: "有序集合添加" },
  { cmd: "ZRANGE key 0 -1 WITHSCORES", desc: "获取有序集合" },
  { cmd: "EXISTS key", desc: "检查键是否存在" },
  { cmd: "TTL key", desc: "获取键的过期时间" },
  { cmd: "EXPIRE key seconds", desc: "设置键的过期时间" },
];

function RedisConsolePanel({ connectionDetails }: RedisConsolePanelProps) {
  const [commandHistory, setCommandHistory] = useState<ConsoleEntry[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  /** 待确认的危险命令 */
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const connectionId = connectionDetails.base_config_id;
  const connectionName = connectionDetails.connection_name || "未知连接";

  // 自动滚动到底部
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [commandHistory]);

  // 聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /** 追加一条历史记录，并重置输入框与历史游标 */
  const pushEntry = (entry: ConsoleEntry) => {
    setCommandHistory((prev) => [...prev, entry]);
    setCurrentInput("");
    setHistoryIndex(-1);
  };

  const runCommand = async (command: string) => {
    setLoading(true);
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    try {
      const responseJson = await invoke<string>("redis_execute_command", {
        connectionId,
        command,
      });

      const { response_code, response_msg } =
        parseBaseResponse<RedisCommandResponse>(responseJson);

      if (response_code === 0) {
        pushEntry({
          command,
          response: response_msg,
          timestamp,
          duration: Date.now() - startTime,
        });
      } else {
        pushEntry({
          command,
          error: response_msg || "执行失败",
          timestamp,
          duration: Date.now() - startTime,
        });
      }
    } catch (err) {
      pushEntry({
        command,
        error: getErrorMessage(err),
        timestamp,
        duration: Date.now() - startTime,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    const command = currentInput.trim();
    if (!command || loading) return;

    const commandUpper = command.toUpperCase().split(/\s+/)[0];
    if (DANGEROUS_COMMANDS.includes(commandUpper)) {
      setPendingCommand(command);
      return;
    }

    void runCommand(command);
  };

  const handleConfirmDangerous = () => {
    const command = pendingCommand;
    setPendingCommand(null);
    if (command) void runCommand(command);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleExecute();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(
          commandHistory[commandHistory.length - 1 - newIndex].command,
        );
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(
          commandHistory[commandHistory.length - 1 - newIndex].command,
        );
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput("");
      }
    } else if (e.key === "Escape") {
      // 与输入栏提示「ESC 清空」保持一致：只清空当前输入，不删除历史
      e.preventDefault();
      setCurrentInput("");
      setHistoryIndex(-1);
    }
  };

  const formatResponse = (response?: RedisCommandResponse): ReactNode => {
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
                isJson
                  ? "rounded-[var(--radius-control)] bg-base-200/60 p-2"
                  : ""
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
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Redis 控制台"
        subtitle={`连接 ${connectionName}`}
        actions={
          <>
            <ActionButton
              size="sm"
              title="清空历史"
              icon={<IoTrashOutline aria-hidden="true" />}
              onClick={() => setCommandHistory([])}
              disabled={commandHistory.length === 0}
            >
              清空
            </ActionButton>
            <ActionButton
              size="sm"
              title="常用命令帮助"
              aria-expanded={showHelp}
              icon={<IoHelpCircleOutline aria-hidden="true" />}
              onClick={() => setShowHelp((prev) => !prev)}
            >
              帮助
            </ActionButton>
          </>
        }
      />

      {/* 帮助面板 */}
      {showHelp ? (
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
                <span className="truncate text-base-content/60">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-0.5 text-micro text-base-content/45">
            <p>按 Enter 执行命令，↑↓ 浏览历史，ESC 清空输入</p>
            <p>支持引号内的空格，如 SET key "hello world"</p>
            <p>FLUSHALL、FLUSHDB、SHUTDOWN 会弹出二次确认</p>
          </div>
        </div>
      ) : null}

      {/* 输出区标题栏 */}
      <Toolbar
        left={
          <>
            <span className="text-xs font-medium text-base-content/70">
              命令输出
            </span>
            {loading ? (
              <StatusChip tone="info" dot>
                执行中…
              </StatusChip>
            ) : null}
          </>
        }
        right={
          <span className="text-micro text-base-content/45">
            {commandHistory.length} 条记录
          </span>
        }
      />

      {/* 输出区域 */}
      <div
        role="log"
        aria-live="polite"
        aria-label="命令输出"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-base-300/20 p-3 font-mono text-xs"
      >
        {commandHistory.length === 0 ? (
          <EmptyState
            icon={<FaTerminal size="1.5em" aria-hidden="true" />}
            title="还没有执行过命令"
            description="在下方输入 Redis 命令并回车，例如 PING。"
          />
        ) : (
          <div className="space-y-3">
            {commandHistory.map((item, index) => (
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
                    formatResponse(item.response)
                  )}
                </div>
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>
        )}
      </div>

      {/* 输入行 */}
      <Toolbar
        className="border-b-0 border-t"
        left={
          <>
            <span
              className="font-mono font-bold text-primary"
              aria-hidden="true"
            >
              &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              aria-label="Redis 命令输入"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入 Redis 命令…"
              className="input h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border-hairline bg-base-200/60 px-2 font-mono text-xs focus-visible:border-primary/50"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
          </>
        }
        right={
          <ActionButton
            variant="primary"
            size="sm"
            aria-label="执行命令"
            title="执行（Enter）"
            icon={<IoSend aria-hidden="true" />}
            loading={loading}
            disabled={!currentInput.trim()}
            onClick={handleExecute}
          >
            执行
          </ActionButton>
        }
      />
      <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline px-3 py-1 text-micro text-base-content/40">
        <span>Enter 执行</span>
        <span>↑↓ 浏览历史</span>
        <span>ESC 清空输入</span>
        <span>危险命令需二次确认</span>
      </div>

      {/* 危险命令确认 */}
      <ConfirmDialog
        open={pendingCommand !== null}
        title="确认执行危险命令"
        description={
          <>
            即将执行{" "}
            <span className="break-all font-mono text-error">
              {pendingCommand}
            </span>
            ，该操作可能清空数据且无法撤销，确定继续吗？
          </>
        }
        confirmText="执行"
        busy={loading}
        onConfirm={handleConfirmDangerous}
        onCancel={() => setPendingCommand(null)}
      />
    </div>
  );
}

export default RedisConsolePanel;
