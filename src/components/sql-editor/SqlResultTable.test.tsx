import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SqlResultTable from "./SqlResultTable";

const noop = () => {};

describe("SqlResultTable", () => {
  it("渲染搜索、总行数、分页与结果单元格", () => {
    const html = renderToStaticMarkup(
      <SqlResultTable
        columns={[{ name: "id" }]}
        rows={[{ id: "1" }]}
        isEmpty={false}
        loading={false}
        searchTerm=""
        onSearchTermChange={noop}
        executionTime={0}
        totalRows={1}
        currentPage={1}
        totalPages={1}
        onPageChange={noop}
      />,
    );

    expect(html).toContain("总计 1 行");
    expect(html).toContain("1 / 1");
    expect(html).toContain("id");
  });

  it("检索无匹配时展示带搜索词的空态", () => {
    const html = renderToStaticMarkup(
      <SqlResultTable
        columns={[]}
        rows={[]}
        isEmpty
        loading={false}
        searchTerm="abc"
        onSearchTermChange={noop}
        executionTime={0}
        totalRows={0}
        currentPage={1}
        totalPages={0}
        onPageChange={noop}
      />,
    );

    expect(html).toContain("没有匹配的数据");
    expect(html).toContain("没有找到与「abc」匹配的数据。");
  });
});
