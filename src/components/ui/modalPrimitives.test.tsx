import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Modal from "./Modal";
import ProgressBar from "./ProgressBar";
import PromptDialog from "./PromptDialog";

describe("Modal", () => {
  it("open=false 不渲染", () => {
    expect(
      renderToStaticMarkup(
        <Modal open={false} title="标题" onClose={() => {}}>
          body
        </Modal>,
      ),
    ).toBe("");
  });

  it("open=true 渲染标题、内容与底部操作区", () => {
    const html = renderToStaticMarkup(
      <Modal
        open
        title="设置过期时间"
        onClose={() => {}}
        footer={<button type="button">确定</button>}
      >
        <p>内容</p>
      </Modal>,
    );

    expect(html).toContain("设置过期时间");
    expect(html).toContain("内容");
    expect(html).toContain("确定");
    expect(html).toContain("modal-backdrop");
  });
});

describe("PromptDialog", () => {
  it("渲染说明、字段与默认确认文案", () => {
    const html = renderToStaticMarkup(
      <PromptDialog
        open
        title="设置过期时间"
        label="过期秒数"
        htmlFor="ttl"
        description={<p>键：cache</p>}
        value=""
        onChange={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(html).toContain("过期秒数");
    expect(html).toContain("键：cache");
    expect(html).toContain("确定");
    expect(html).toContain("取消");
  });
});

describe("ProgressBar", () => {
  it("暴露 progressbar 语义与百分比", () => {
    const html = renderToStaticMarkup(
      <ProgressBar
        label="上传中"
        detail="1 MB / 2 MB"
        percent={50}
        ariaLabel="上传进度"
      />,
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain("50%");
    expect(html).toContain("1 MB / 2 MB");
  });
});
