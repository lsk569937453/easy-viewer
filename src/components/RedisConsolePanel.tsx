import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { IoHelpCircleOutline, IoTrashOutline } from "react-icons/io5";
import { executeRedisCommand } from "../services/redis";
import type { ConnectionSummary, RedisCommandResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { CommandHelpPanel } from "./redis-console/CommandHelpPanel";
import { CommandLog } from "./redis-console/CommandLog";
import { ConsoleInputRow } from "./redis-console/ConsoleInputRow";
import { isDangerousCommand } from "./redis-console/consoleConfig";
import { useConsoleHistory } from "./redis-console/useConsoleHistory";
import ActionButton from "./ui/ActionButton";
import ConfirmDialog from "./ui/ConfirmDialog";
import PageHeader from "./ui/PageHeader";
import StatusChip from "./ui/StatusChip";
import Toolbar from "./ui/Toolbar";

interface RedisConsolePanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

/**
 * Redis 控制台：历史/按键在 useConsoleHistory，响应渲染在 RedisResponseView，
 * 帮助面板与输出区在独立子组件，这里只保留命令执行与组合。
 */
function RedisConsolePanel({ connectionDetails }: RedisConsolePanelProps) {
  const {
    commandHistory,
    currentInput,
    setCurrentInput,
    pushEntry,
    clearHistory,
    handleKeyDown: handleHistoryKeyDown,
  } = useConsoleHistory();
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

  const runCommand = async (command: string) => {
    setLoading(true);
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    try {
      const responseJson = await executeRedisCommand(connectionId, command);

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

    if (isDangerousCommand(command)) {
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
    handleHistoryKeyDown(e, handleExecute);
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
              onClick={clearHistory}
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
      <CommandHelpPanel open={showHelp} />

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
      <CommandLog entries={commandHistory} outputEndRef={outputEndRef} />

      {/* 输入行 */}
      <ConsoleInputRow
        inputRef={inputRef}
        value={currentInput}
        loading={loading}
        onChange={setCurrentInput}
        onKeyDown={handleKeyDown}
        onExecute={handleExecute}
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
