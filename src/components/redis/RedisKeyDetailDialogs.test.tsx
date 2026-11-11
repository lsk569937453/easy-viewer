import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RedisKeyDetailDialogs } from "./RedisKeyDetailDialogs";

const noop = () => {};

const baseProps = {
  keyName: "cache:user:1",
  actionLoading: false,
  showDeleteConfirm: false,
  onCancelDelete: noop,
  onConfirmDelete: noop,
  showTtlModal: false,
  newTtlSeconds: "",
  onTtlSecondsChange: noop,
  onCancelTtl: noop,
  onConfirmTtl: noop,
};

describe("RedisKeyDetailDialogs", () => {
  it("过期时间弹窗渲染标题、输入框与帮助文案", () => {
    const html = renderToStaticMarkup(
      <RedisKeyDetailDialogs
        {...baseProps}
        showTtlModal
        newTtlSeconds="3600"
      />,
    );

    expect(html).toContain("设置过期时间");
    expect(html).toContain('id="redis-ttl-seconds"');
    expect(html).toContain("留空或输入 0 表示移除过期时间（PERSIST）。");
    expect(html).toContain("cache:user:1");
  });

  it("删除确认渲染键名与不可撤销提示，弹窗关闭时不渲染过期输入", () => {
    const html = renderToStaticMarkup(
      <RedisKeyDetailDialogs {...baseProps} showDeleteConfirm />,
    );

    expect(html).toContain("删除键");
    expect(html).toContain("该操作不可撤销");
    expect(html).toContain("「cache:user:1」");
    expect(html).not.toContain("过期秒数");
  });
});
