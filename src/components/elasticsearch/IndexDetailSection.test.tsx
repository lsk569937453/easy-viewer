import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EsIndexDetail } from "../../types/elasticsearch";
import IndexDetailSection from "./IndexDetailSection";

const detail: EsIndexDetail = {
  number_of_shards: 3,
  number_of_replicas: 1,
  uuid: "abc-uuid",
  creation_date: "1700000000000",
  matching_templates: [
    { name: "logs-template", index_patterns: "logs-*", order: "1" },
    { name: "default-template", index_patterns: "*", order: "0" },
  ],
  ilm_policy_name: "logs-ilm",
  ilm_rollover_alias: "logs",
  ilm_policy_detail: {
    policy: {
      phases: {
        hot: { min_age: "0d", actions: { rollover: { max_size: "50gb" } } },
      },
    },
  },
};

const render = (overrides: Partial<Parameters<typeof IndexDetailSection>[0]>) =>
  renderToStaticMarkup(
    <IndexDetailSection
      showDetail
      indexDetail={null}
      detailLoading={false}
      detailError={null}
      onRetry={() => {}}
      {...overrides}
    />,
  );

describe("IndexDetailSection", () => {
  it("收起时不渲染任何内容", () => {
    expect(render({ showDetail: false })).toBe("");
  });

  it("加载中与错误态展示对应语义", () => {
    const loading = render({ detailLoading: true });
    expect(loading).toContain("正在读取索引详情…");

    const failed = render({ detailError: "连接超时" });
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("索引详情读取失败");
    expect(failed).toContain("连接超时");
  });

  it("详情渲染分片、模板与 ILM 阶段", () => {
    const html = render({ indexDetail: detail });

    expect(html).toContain("分片数");
    expect(html).toContain("绑定模板（2）");
    expect(html).toContain("logs-template");
    expect(html).toContain("生命周期策略（ILM）");
    expect(html).toContain("HOT");
    expect(html).toContain("rollover");
    expect(html).toContain("查看完整策略 JSON");
  });

  it("缺少详情数据时展示空态", () => {
    expect(render({})).toContain("暂无索引详情");
  });
});
