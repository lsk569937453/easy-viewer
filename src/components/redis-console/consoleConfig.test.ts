import { describe, expect, it } from "vitest";
import {
  COMMON_COMMANDS,
  commandHead,
  isDangerousCommand,
} from "./consoleConfig";

describe("isDangerousCommand", () => {
  it("命中危险命令：忽略大小写、允许带参数", () => {
    expect(isDangerousCommand("flushall")).toBe(true);
    expect(isDangerousCommand("FLUSHDB ASYNC")).toBe(true);
    expect(isDangerousCommand("shutdown")).toBe(true);
  });

  it("普通命令不触发二次确认", () => {
    expect(isDangerousCommand("GET key")).toBe(false);
    expect(isDangerousCommand("ping")).toBe(false);
  });
});

describe("commandHead", () => {
  it("取首词并大写", () => {
    expect(commandHead("get  key")).toBe("GET");
  });

  it("常用命令表包含基础命令说明", () => {
    expect(COMMON_COMMANDS.some((item) => item.cmd === "PING")).toBe(true);
    expect(COMMON_COMMANDS.every((item) => item.desc.length > 0)).toBe(true);
  });
});
