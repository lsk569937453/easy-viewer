import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { IoSend } from "react-icons/io5";
import ActionButton from "../ui/ActionButton";
import Toolbar from "../ui/Toolbar";

export interface ConsoleInputRowProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onExecute: () => void;
}

/** 控制台输入行：提示符 + 命令输入框 + 执行按钮。 */
export function ConsoleInputRow({
  inputRef,
  value,
  loading,
  onChange,
  onKeyDown,
  onExecute,
}: ConsoleInputRowProps) {
  return (
    <Toolbar
      className="border-b-0 border-t"
      left={
        <>
          <span className="font-mono font-bold text-primary" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            aria-label="Redis 命令输入"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
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
          disabled={!value.trim()}
          onClick={onExecute}
        >
          执行
        </ActionButton>
      }
    />
  );
}
