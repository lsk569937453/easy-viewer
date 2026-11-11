import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WindowControls from "./WindowControls";

const noop = () => {};

describe("WindowControls", () => {
  it("渲染三个窗口按钮且区域可禁用拖拽", () => {
    const html = renderToStaticMarkup(
      <WindowControls
        onMinimize={noop}
        onToggleMaximize={noop}
        onClose={noop}
      />,
    );

    expect(html).toContain('aria-label="最小化窗口"');
    expect(html).toContain('aria-label="最大化或还原窗口"');
    expect(html).toContain('aria-label="关闭窗口"');
    expect(html).toContain("data-tauri-no-drag");
  });
});
