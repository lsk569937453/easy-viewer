import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConnectionSummary } from "../types/backend";
import type { TreeNode } from "../types/tree";
import ElasticsearchIndexPanel from "./ElasticsearchIndexPanel";

const node: TreeNode = {
  id: "1/es/logs",
  name: "logs-2026",
  type: "esIndexBrowser",
  path: [
    { level: 1, config_value: "1" },
    { level: 2, config_value: "logs-2026" },
  ],
};

const connectionDetails: ConnectionSummary = {
  base_config_id: 1,
  connection_name: "本地 ES",
  connection_type: 0,
  description: "",
  host: "127.0.0.1",
  port: 9200,
};

describe("ElasticsearchIndexPanel", () => {
  it("SSR 渲染页头、分段条、工具条与空表（不触发请求）", () => {
    const html = renderToStaticMarkup(
      <ElasticsearchIndexPanel
        activeTabNode={node}
        connectionDetails={connectionDetails}
      />,
    );

    expect(html).toContain("logs-2026");
    expect(html).toContain("Elasticsearch 索引");
    expect(html).toContain('role="tablist"');
    expect(html).toContain("简单搜索");
    expect(html).toContain('aria-label="搜索文档"');
    expect(html).toContain("暂无文档");
  });
});
