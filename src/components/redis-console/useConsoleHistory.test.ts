import { describe, expect, it } from "vitest";
import type { ConsoleEntry } from "./consoleConfig";
import { navigateHistory } from "./useConsoleHistory";

const entry = (command: string): ConsoleEntry => ({
  command,
  timestamp: "10:00:00",
  duration: 1,
});

const history = [entry("PING"), entry("GET a"), entry("SET a 1")];

describe("navigateHistory", () => {
  it("↑ 从最新一条逐条上溯，到顶后保持游标", () => {
    expect(navigateHistory(history, -1, "up")).toEqual({
      historyIndex: 0,
      input: "SET a 1",
    });
    expect(navigateHistory(history, 0, "up")).toEqual({
      historyIndex: 1,
      input: "GET a",
    });
    expect(navigateHistory(history, 2, "up")).toEqual({ historyIndex: 2 });
  });

  it("↓ 回退，最旧一条时清空输入并复位游标", () => {
    expect(navigateHistory(history, 2, "down")).toEqual({
      historyIndex: 1,
      input: "GET a",
    });
    // 游标从末尾开始计数：index 1 → 0 回到最新一条，再按 ↓ 才清空
    expect(navigateHistory(history, 1, "down")).toEqual({
      historyIndex: 0,
      input: "SET a 1",
    });
    expect(navigateHistory(history, 0, "down")).toEqual({
      historyIndex: -1,
      input: "",
    });
    expect(navigateHistory(history, -1, "down")).toEqual({ historyIndex: -1 });
  });

  it("空历史时游标不变且不改输入", () => {
    expect(navigateHistory([], -1, "up")).toEqual({ historyIndex: -1 });
    expect(navigateHistory([], -1, "down")).toEqual({ historyIndex: -1 });
  });
});
