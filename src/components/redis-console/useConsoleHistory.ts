import { type KeyboardEvent as ReactKeyboardEvent, useState } from "react";
import type { ConsoleEntry } from "./consoleConfig";

export interface HistoryNavigation {
  historyIndex: number;
  /** 需要写回输入框的命令；缺省表示保持当前输入不变 */
  input?: string;
}

/**
 * ↑↓ 浏览历史的纯函数版本：分支顺序与边界处理与拆分前的内联实现一致。
 */
export const navigateHistory = (
  history: ConsoleEntry[],
  historyIndex: number,
  direction: "up" | "down",
): HistoryNavigation => {
  if (direction === "up") {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      return {
        historyIndex: newIndex,
        input: history[history.length - 1 - newIndex].command,
      };
    }
    return { historyIndex };
  }

  if (historyIndex > 0) {
    const newIndex = historyIndex - 1;
    return {
      historyIndex: newIndex,
      input: history[history.length - 1 - newIndex].command,
    };
  }
  if (historyIndex === 0) {
    return { historyIndex: -1, input: "" };
  }
  return { historyIndex };
};

export interface ConsoleHistoryState {
  commandHistory: ConsoleEntry[];
  currentInput: string;
  setCurrentInput: (value: string) => void;
  pushEntry: (entry: ConsoleEntry) => void;
  clearHistory: () => void;
  handleKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
    onEnter: () => void,
  ) => void;
}

/** 命令历史、输入框内容与 ↑↓/ESC 键处理。 */
export function useConsoleHistory(): ConsoleHistoryState {
  const [commandHistory, setCommandHistory] = useState<ConsoleEntry[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  /** 追加一条历史记录，并重置输入框与历史游标 */
  const pushEntry = (entry: ConsoleEntry) => {
    setCommandHistory((prev) => [...prev, entry]);
    setCurrentInput("");
    setHistoryIndex(-1);
  };

  const clearHistory = () => setCommandHistory([]);

  const handleKeyDown = (
    e: ReactKeyboardEvent<HTMLInputElement>,
    onEnter: () => void,
  ) => {
    if (e.key === "Enter") {
      onEnter();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = navigateHistory(commandHistory, historyIndex, "up");
      setHistoryIndex(next.historyIndex);
      if (next.input !== undefined) setCurrentInput(next.input);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = navigateHistory(commandHistory, historyIndex, "down");
      setHistoryIndex(next.historyIndex);
      if (next.input !== undefined) setCurrentInput(next.input);
    } else if (e.key === "Escape") {
      // 与输入栏提示「ESC 清空」保持一致：只清空当前输入，不删除历史
      e.preventDefault();
      setCurrentInput("");
      setHistoryIndex(-1);
    }
  };

  return {
    commandHistory,
    currentInput,
    setCurrentInput,
    pushEntry,
    clearHistory,
    handleKeyDown,
  };
}
