import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RedisKeyDetailHeader } from "./RedisKeyDetailHeader";
import type { RedisTypeMeta } from "./redisKeyUtils";

const noop = () => {};

const typeMeta: RedisTypeMeta = { label: "字符串", tone: "info" };

const baseProps = {
  keyName: "cache:user:1",
  connectionName: "本地 Redis",
  typeMeta,
  ttl: 3600,
  memoryUsage: 2048,
  itemCount: 3,
  loading: false,
  onRefresh: noop,
  onOpenTtl: noop,
  onRequestDelete: noop,
  onCopyKey: noop,
};

describe("RedisKeyDetailHeader", () => {
  it("渲染键名、连接、类型与键信息", () => {
    const html = renderToStaticMarkup(<RedisKeyDetailHeader {...baseProps} />);

    expect(html).toContain("cache:user:1");
    expect(html).toContain("连接 本地 Redis");
    expect(html).toContain("字符串");
    expect(html).toContain("剩余 1 小时");
    expect(html).toContain("2 KB");
    expect(html).toContain("3 项");
  });

  it("TTL/内存缺失时展示占位文案", () => {
    const html = renderToStaticMarkup(
      <RedisKeyDetailHeader {...baseProps} ttl={null} memoryUsage={null} />,
    );

    expect(html).toContain("读取中…");
    expect(html).toContain("—");
    expect(html).toContain("删除");
  });
});
