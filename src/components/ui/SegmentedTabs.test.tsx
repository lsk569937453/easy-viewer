import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SegmentedTabs from "./SegmentedTabs";

const items = [
  { id: "a", label: "甲" },
  { id: "b", label: "乙" },
] as const;

describe("SegmentedTabs", () => {
  it("渲染 tablist / tab 语义与选中态", () => {
    const html = renderToStaticMarkup(
      <SegmentedTabs items={items} activeId="b" onChange={() => {}} />,
    );

    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("乙");
  });

  it("附加容器类时保留基础类名", () => {
    const html = renderToStaticMarkup(
      <SegmentedTabs
        items={items}
        activeId="a"
        onChange={() => {}}
        className="bg-base-200/40"
      />,
    );

    expect(html).toContain("border-hairline");
    expect(html).toContain("bg-base-200/40");
  });
});
