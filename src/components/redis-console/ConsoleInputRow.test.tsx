import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsoleInputRow } from "./ConsoleInputRow";

const noop = () => {};

describe("ConsoleInputRow", () => {
  it("渲染命令输入框与执行按钮", () => {
    const html = renderToStaticMarkup(
      <ConsoleInputRow
        inputRef={{ current: null }}
        value="PING"
        loading={false}
        onChange={noop}
        onKeyDown={noop}
        onExecute={noop}
      />,
    );

    expect(html).toContain('aria-label="Redis 命令输入"');
    expect(html).toContain("输入 Redis 命令…");
    expect(html).toContain('aria-label="执行命令"');
    expect(html).toContain("执行");
  });

  it("输入为空或执行中时禁用执行按钮", () => {
    const html = renderToStaticMarkup(
      <ConsoleInputRow
        inputRef={{ current: null }}
        value=""
        loading={false}
        onChange={noop}
        onKeyDown={noop}
        onExecute={noop}
      />,
    );

    expect(html).toMatch(/disabled=""/);
  });
});
