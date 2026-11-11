import type { RefObject } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandLog } from "./CommandLog";
import type { ConsoleEntry } from "./consoleConfig";

const outputEndRef: RefObject<HTMLDivElement | null> = { current: null };

describe("CommandLog", () => {
  it("无历史时渲染空态与 log 语义", () => {
    const html = renderToStaticMarkup(
      <CommandLog entries={[]} outputEndRef={outputEndRef} />,
    );

    expect(html).toContain('aria-label="命令输出"');
    expect(html).toContain("还没有执行过命令");
  });

  it("有历史时渲染命令、耗时与错误信息", () => {
    const entries: ConsoleEntry[] = [
      {
        command: "PING",
        timestamp: "10:00:00",
        duration: 5,
        error: "连接失败",
      },
    ];
    const html = renderToStaticMarkup(
      <CommandLog entries={entries} outputEndRef={outputEndRef} />,
    );

    expect(html).toContain("PING");
    expect(html).toContain("5ms");
    expect(html).toContain("连接失败");
  });
});
