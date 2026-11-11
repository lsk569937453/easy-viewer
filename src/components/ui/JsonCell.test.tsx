import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JsonCell from "./JsonCell";

describe("JsonCell", () => {
  it("空值渲染占位符", () => {
    expect(renderToStaticMarkup(<JsonCell value={null} />)).toContain("-");
  });

  it("对象 JSON 渲染为格式化 pre", () => {
    const html = renderToStaticMarkup(<JsonCell value='{"a":1}' />);
    expect(html).toContain("<pre");
    expect(html).toContain("&quot;a&quot;: 1");
  });

  it("非法 JSON 按纯文本渲染并截断长文本", () => {
    const long = `{${"x".repeat(200)}`;
    const html = renderToStaticMarkup(<JsonCell value={long} maxLength={10} />);
    expect(html).not.toContain("<pre");
    expect(html).toContain("...");
    expect(html).toContain(`title="${long}"`);
  });

  it("普通短文本直接输出", () => {
    const html = renderToStaticMarkup(<JsonCell value="hello" />);
    expect(html).toContain("hello");
    expect(html).not.toContain("<pre");
  });

  it("parseScalarJson 时标量也按 JSON 块渲染（消息正文沿用旧行为）", () => {
    const html = renderToStaticMarkup(<JsonCell value="123" parseScalarJson />);
    expect(html).toContain("<pre");
    expect(html).toContain("123");
  });
});
