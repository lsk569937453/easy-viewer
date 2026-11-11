import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import KeyValueTable from "./KeyValueTable";
import Pagination from "./Pagination";
import StatusChip from "./StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./states";

// 原语都是无副作用展示组件，用 SSR 渲染验证结构与语义
describe("ui 原语", () => {
  it("EmptyState 渲染标题、描述与 status 语义", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="暂无数据" description="换个条件试试" />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("暂无数据");
    expect(html).toContain("换个条件试试");
  });

  it("ErrorState 渲染 alert 语义与重试按钮", () => {
    const html = renderToStaticMarkup(
      <ErrorState description="连接超时" onRetry={() => {}} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("连接超时");
    expect(html).toContain("重试");
  });

  it("LoadingState 渲染状态语义与自定义文案", () => {
    const html = renderToStaticMarkup(<LoadingState label="正在读取…" />);

    expect(html).toContain('role="status"');
    expect(html).toContain("正在读取…");
  });

  it("Pagination 输出页码与上下页按钮的可用状态", () => {
    const first = renderToStaticMarkup(
      <Pagination page={1} totalPages={3} onPageChange={() => {}} />,
    );
    expect(first).toContain("1 / 3");
    // 首页时"上一页"禁用（React 按 JSX 顺序输出属性，disabled 在 aria-label 之前）
    expect(first).toMatch(/disabled=""[^>]*aria-label="上一页"/);

    const last = renderToStaticMarkup(
      <Pagination page={3} totalPages={3} onPageChange={() => {}} />,
    );
    expect(last).toContain("3 / 3");
    expect(last).toMatch(/disabled=""[^>]*aria-label="下一页"/);
  });

  it("StatusChip 按 tone 输出语义色与小胶囊样式", () => {
    const html = renderToStaticMarkup(
      <StatusChip tone="success">在线</StatusChip>,
    );

    expect(html).toContain("app-chip");
    expect(html).toContain("text-success");
    expect(html).toContain("在线");
  });

  it("KeyValueTable 渲染每一行的标签与值", () => {
    const html = renderToStaticMarkup(
      <KeyValueTable rows={[{ label: "大小", value: "12 KB" }]} />,
    );

    expect(html).toContain("大小");
    expect(html).toContain("12 KB");
  });
});
