import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SqlHeader } from "../../types/backend";
import DocumentTable from "./DocumentTable";

const headers: SqlHeader[] = [
  { name: "_id", type_name: "text", is_primary_key: true },
  { name: "age", type_name: "int", is_primary_key: false },
];

const render = (overrides: Partial<Parameters<typeof DocumentTable>[0]>) =>
  renderToStaticMarkup(
    <DocumentTable
      documents={[["1", "30"]]}
      headers={headers}
      expandedRows={new Set()}
      loading={false}
      error={null}
      hasActiveFilter={false}
      onToggleRow={() => {}}
      onRetry={() => {}}
      {...overrides}
    />,
  );

describe("DocumentTable", () => {
  it("渲染表头、主键标记与单元格值", () => {
    const html = render({});

    expect(html).toContain('aria-label="展开文档详情"');
    expect(html).toContain("_id");
    expect(html).toContain("主键");
    expect(html).toContain("age");
    expect(html).toContain("30");
  });

  it("展开行渲染文档详情 JSON", () => {
    const html = render({ expandedRows: new Set([0]) });

    expect(html).toContain("文档详情");
    expect(html).toContain("&quot;_id&quot;: 1");
    expect(html).toContain("&quot;age&quot;: 30");
  });

  it("错误态优先于表格展示并可重试", () => {
    const html = render({ error: "连接超时" });

    expect(html).toContain('role="alert"');
    expect(html).toContain("读取文档失败");
    expect(html).toContain("重试");
    expect(html).not.toContain("<table");
  });

  it("无文档时按筛选态给出不同空态文案", () => {
    expect(render({ documents: [] })).toContain("该索引中还没有文档。");
    expect(render({ documents: [], hasActiveFilter: true })).toContain(
      "当前搜索条件下没有匹配的文档，试试调整条件。",
    );
  });
});
