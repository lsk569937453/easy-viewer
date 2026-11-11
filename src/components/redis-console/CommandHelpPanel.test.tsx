import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandHelpPanel } from "./CommandHelpPanel";

describe("CommandHelpPanel", () => {
  it("展开时渲染常用命令与快捷键说明", () => {
    const html = renderToStaticMarkup(<CommandHelpPanel open />);

    expect(html).toContain("常用 Redis 命令");
    expect(html).toContain("PING");
    expect(html).toContain("按 Enter 执行命令，↑↓ 浏览历史，ESC 清空输入");
  });

  it("关闭时不渲染任何内容", () => {
    expect(renderToStaticMarkup(<CommandHelpPanel open={false} />)).toBe("");
  });
});
