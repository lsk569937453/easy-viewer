import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UploadTaskBody, {
  UploadHintPanel,
  type UploadTaskBodyProps,
} from "./UploadTaskBody";

const IDLE: Omit<UploadTaskBodyProps, "onRetry"> = {
  error: null,
  isUploading: false,
  singleProgress: { uploaded: 0, total: 0 },
  progress: { current: 0, total: 0, fileName: "" },
  singlePercent: 0,
  folderPercent: 0,
  result: null,
};

describe("UploadTaskBody", () => {
  it("失败时渲染 alert 与重试按钮", () => {
    const html = renderToStaticMarkup(
      <UploadTaskBody {...IDLE} error="网络中断" onRetry={() => {}} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("网络中断");
    expect(html).toContain("重试");
  });

  it("单文件上传时渲染进度条与字节数", () => {
    const html = renderToStaticMarkup(
      <UploadTaskBody
        {...IDLE}
        isUploading
        singleProgress={{ uploaded: 1048576, total: 2097152 }}
        singlePercent={50}
      />,
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain("1 MB / 2 MB");
  });

  it("结果态显示成功标记与结果文案", () => {
    const html = renderToStaticMarkup(
      <UploadTaskBody
        {...IDLE}
        result={{ tone: "success", text: "全部 2 个文件上传成功" }}
      />,
    );

    expect(html).toContain("成功");
    expect(html).toContain("全部 2 个文件上传成功");
  });
});

describe("UploadHintPanel", () => {
  it("渲染上传说明与进度事件名", () => {
    const html = renderToStaticMarkup(<UploadHintPanel />);

    expect(html).toContain("上传说明");
    expect(html).toContain("s3-upload-progress");
  });
});
