import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TabContextMenu from "./TabContextMenu";

const noop = () => {};

describe("TabContextMenu", () => {
  it("展开时渲染三个关闭菜单项", () => {
    const html = renderToStaticMarkup(
      <TabContextMenu
        visible
        position={{ x: 10, y: 20 }}
        containerRef={createRef<HTMLDivElement>()}
        menuRef={createRef<HTMLDivElement>()}
        onKeyDown={noop}
        onCloseLeft={noop}
        onCloseRight={noop}
        onCloseAll={noop}
      />,
    );

    expect(html).toContain('role="menu"');
    expect(html).toContain("关闭左侧标签页");
    expect(html).toContain("关闭右侧标签页");
    expect(html).toContain("关闭所有标签页");
  });

  it("未展开时不渲染内容", () => {
    const html = renderToStaticMarkup(
      <TabContextMenu
        visible={false}
        position={{ x: 0, y: 0 }}
        containerRef={createRef<HTMLDivElement>()}
        menuRef={createRef<HTMLDivElement>()}
        onKeyDown={noop}
        onCloseLeft={noop}
        onCloseRight={noop}
        onCloseAll={noop}
      />,
    );

    expect(html).toBe("");
  });
});
