import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RedisResponseView } from "./RedisResponseView";

describe("RedisResponseView", () => {
  it("整数响应带（整数）前缀与耗时", () => {
    const html = renderToStaticMarkup(
      <RedisResponseView
        response={{
          response_type: "integer",
          value: "3",
          execution_time_ms: 2,
        }}
      />,
    );

    expect(html).toContain("（整数）3");
    expect(html).toContain("2ms");
  });

  it("空响应与数组响应保留原文案", () => {
    const nil = renderToStaticMarkup(
      <RedisResponseView
        response={{ response_type: "nil", execution_time_ms: 1 }}
      />,
    );
    expect(nil).toContain("（空）");

    const array = renderToStaticMarkup(
      <RedisResponseView
        response={{
          response_type: "array",
          array_items: ["a", "b"],
          execution_time_ms: 4,
        }}
      />,
    );
    expect(array).toContain("（2 个元素）");
    expect(array).toContain("a");
  });

  it("字符串 JSON 格式化为 pre，空数组走空数组文案", () => {
    const json = renderToStaticMarkup(
      <RedisResponseView
        response={{
          response_type: "string",
          value: '{"a":1}',
          execution_time_ms: 1,
        }}
      />,
    );
    expect(json).toContain("<pre");
    expect(json).toContain("&quot;a&quot;: 1");

    const emptyArray = renderToStaticMarkup(
      <RedisResponseView
        response={{
          response_type: "array",
          array_items: [],
          execution_time_ms: 1,
        }}
      />,
    );
    expect(emptyArray).toContain("（空数组）");
  });
});
