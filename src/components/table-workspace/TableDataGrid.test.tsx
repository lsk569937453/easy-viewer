import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TableDataGrid from "./TableDataGrid";

const noop = () => {};

describe("TableDataGrid", () => {
  it("渲染工具条插槽、表头、单元格与操作列", () => {
    const html = renderToStaticMarkup(
      <TableDataGrid
        columnHeaders={["id", "name"]}
        rows={[{ id: "1", name: "Alice" }]}
        isEmpty={false}
        sqlQuery="select * from users"
        toolbar={<div>表格工具栏</div>}
        onCellChange={noop}
        onCellInput={noop}
        onRequestDelete={noop}
      />,
    );

    expect(html).toContain("表格工具栏");
    expect(html).toContain("操作");
    expect(html).toContain("Alice");
    expect(html).toContain('aria-label="单元格内容"');
  });

  it("未执行查询时展示空态", () => {
    const html = renderToStaticMarkup(
      <TableDataGrid
        columnHeaders={[]}
        rows={[]}
        isEmpty
        sqlQuery=""
        toolbar={null}
        onCellChange={noop}
        onCellInput={noop}
        onRequestDelete={noop}
      />,
    );

    expect(html).toContain("还没有执行查询");
  });
});
