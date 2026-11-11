import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../types/tree";
import IndexDetailPage from "../IndexDetailPage";
import IndexInfoTab from "./IndexInfoTab";
import IndexSqlTab from "./IndexSqlTab";

const node: TreeNode = {
  id: "1/docs/users/idx_name",
  name: "idx_name",
  type: "default",
  path: [
    { level: 1, config_value: "1" },
    { level: 2, config_value: "docs" },
    { level: 3, config_value: "users" },
    { level: 4, config_value: "idx_name" },
  ],
};

describe("IndexDetailPage", () => {
  it("渲染三个页签（SSR 不触发数据加载）", () => {
    const html = renderToStaticMarkup(<IndexDetailPage activeTabNode={node} />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain("基本信息");
    expect(html).toContain("索引列");
    expect(html).toContain("创建 SQL");
  });
});

describe("IndexInfoTab", () => {
  it("无索引信息时展示空态", () => {
    const html = renderToStaticMarkup(
      <IndexInfoTab indexInfo={null} columnCount={0} />,
    );
    expect(html).toContain("没有索引信息");
  });

  it("有索引信息时展示 KV 与列数量", () => {
    const html = renderToStaticMarkup(
      <IndexInfoTab
        indexInfo={{
          name: "idx_name",
          type: "BTREE",
          nonUnique: false,
          tableName: "users",
        }}
        columnCount={2}
      />,
    );
    expect(html).toContain("idx_name");
    expect(html).toContain("BTREE");
    expect(html).toContain("索引名称");
  });
});

describe("IndexSqlTab", () => {
  it("空 SQL 展示占位注释", () => {
    const html = renderToStaticMarkup(<IndexSqlTab createIndexSql="" />);
    expect(html).toContain("无法生成创建索引的 SQL");
  });
});
