import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Tab } from "../../types/tab";
import TabBar from "./TabBar";

const noop = () => {};

const tabs: Tab[] = [
  { id: "tab-1", name: "订单表", type: "info", icon: "T" },
  { id: "tab-2", name: "SQL 查询", type: "info" },
];

describe("TabBar", () => {
  it("渲染标签项、选中态与关闭按钮语义", () => {
    const html = renderToStaticMarkup(
      <TabBar
        tabs={tabs}
        activeTabId="tab-1"
        onTabClick={noop}
        onTabClose={noop}
        onContextMenu={noop}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="打开的标签页"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-label="关闭 订单表 标签页"');
    expect(html).toContain('data-tab-id="tab-2"');
  });

  it("没有标签时不渲染标签条", () => {
    const html = renderToStaticMarkup(
      <TabBar
        tabs={[]}
        activeTabId={null}
        onTabClick={noop}
        onTabClose={noop}
        onContextMenu={noop}
      />,
    );

    expect(html).toBe("");
  });
});
