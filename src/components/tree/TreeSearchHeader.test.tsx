import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TreeSearchHeader from "./TreeSearchHeader";

const noop = () => {};

const baseProps = {
  onChange: noop,
  onClear: noop,
  onSubmit: noop,
};

describe("TreeSearchHeader", () => {
  it("渲染搜索框与匹配计数", () => {
    const html = renderToStaticMarkup(
      <TreeSearchHeader
        value="ord"
        query="ord"
        matchCount={2}
        {...baseProps}
      />,
    );

    expect(html).toContain('placeholder="搜索节点…"');
    expect(html).toContain("2 项匹配");
  });

  it("无匹配结果时展示提示", () => {
    const html = renderToStaticMarkup(
      <TreeSearchHeader
        value="zzz"
        query="zzz"
        matchCount={0}
        {...baseProps}
      />,
    );

    expect(html).toContain("无匹配结果");
  });
});
