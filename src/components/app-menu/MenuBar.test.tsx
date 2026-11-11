import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MenuBar from "./MenuBar";

const noop = () => {};

describe("MenuBar", () => {
  it("渲染品牌与四组菜单，并标出当前主题", () => {
    const html = renderToStaticMarkup(
      <MenuBar
        theme="dark"
        onItemClick={noop}
        onThemeChange={noop}
        onAboutClick={noop}
        onNewConnectionClick={noop}
      />,
    );

    expect(html).toContain("DB Viewer");
    expect(html).toContain("连接");
    expect(html).toContain("主题");
    expect(html).toContain("视图");
    expect(html).toContain("帮助");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("data-tauri-no-drag");
  });
});
