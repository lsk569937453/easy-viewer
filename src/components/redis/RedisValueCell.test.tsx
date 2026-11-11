import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RedisPlainCell,
  RedisStringValue,
  RedisTableCell,
} from "./RedisValueCell";

const noop = () => {};

describe("RedisValueCell", () => {
  it("字符串值：空串占位与 JSON 美化", () => {
    expect(
      renderToStaticMarkup(<RedisStringValue raw="" onCopy={noop} />),
    ).toContain("（空字符串）");

    const html = renderToStaticMarkup(
      <RedisStringValue raw='{"a":1}' onCopy={noop} />,
    );
    expect(html).toContain("字符串值");
    expect(html).toContain("&quot;a&quot;: 1");
  });

  it("普通单元格：空值占位与原始文本", () => {
    expect(renderToStaticMarkup(<RedisPlainCell cell={null} />)).toContain("—");
    expect(renderToStaticMarkup(<RedisPlainCell cell="field" />)).toContain(
      "field",
    );
  });

  it("值单元格：null 显示（空），JSON 渲染 pre 并带复制按钮", () => {
    expect(
      renderToStaticMarkup(<RedisTableCell cell={null} onCopy={noop} />),
    ).toContain("（空）");

    const html = renderToStaticMarkup(
      <RedisTableCell cell='{"a":1}' onCopy={noop} />,
    );
    expect(html).toContain("<pre");
    expect(html).toContain('aria-label="复制单元格内容"');
  });
});
