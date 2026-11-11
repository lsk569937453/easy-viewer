import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QueryDslEditor from "./QueryDslEditor";

describe("QueryDslEditor", () => {
  it("渲染标签、辅助说明与可访问名称", () => {
    const html = renderToStaticMarkup(
      <QueryDslEditor
        queryText='{"match_all": {}}'
        onChange={() => {}}
        onRun={() => {}}
      />,
    );

    expect(html).toContain("Elasticsearch Query DSL（仅需填写 query 部分）");
    expect(html).toContain('aria-label="Elasticsearch Query DSL"');
    expect(html).toContain("Ctrl + Enter 执行");
  });

  it("textarea 输出当前 Query 文本", () => {
    const html = renderToStaticMarkup(
      <QueryDslEditor queryText="get" onChange={() => {}} onRun={() => {}} />,
    );

    expect(html).toContain("<textarea");
    expect(html).toContain("get");
  });
});
