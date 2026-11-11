import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NewConnectionModal from "../NewConnectionModal";

describe("NewConnectionModal", () => {
  it("isOpen=false 渲染空内容", () => {
    expect(
      renderToStaticMarkup(
        <NewConnectionModal isOpen={false} onClose={() => {}} />,
      ),
    ).toBe("");
  });

  it("isOpen=true 渲染标题、关键字段与操作按钮", () => {
    const html = renderToStaticMarkup(
      <NewConnectionModal isOpen onClose={() => {}} />,
    );

    expect(html).toContain('id="new_connection_modal"');
    expect(html).toContain("新建数据库连接");
    expect(html).toContain("连接名称");
    expect(html).toContain("数据库类型");
    expect(html).toContain('id="conn-name"');
    expect(html).toContain('id="conn-type"');
    expect(html).toContain("测试连接");
    expect(html).toContain("创建连接");
    expect(html).toContain("取消");
  });

  it("默认 SQLite + URL 模式渲染文件选择而不是连接字符串", () => {
    const html = renderToStaticMarkup(
      <NewConnectionModal isOpen onClose={() => {}} />,
    );

    expect(html).toContain('id="conn-sqlite-file"');
    expect(html).toContain("选择文件");
    expect(html).not.toContain('id="conn-url"');
    expect(html).not.toContain('id="conn-host"');
  });

  it("编辑模式渲染编辑态标题与更新按钮", () => {
    const html = renderToStaticMarkup(
      <NewConnectionModal isOpen onClose={() => {}} editingId={7} />,
    );

    expect(html).toContain("编辑数据库连接");
    expect(html).toContain("更新连接");
    expect(html).toContain('disabled=""');
  });
});
