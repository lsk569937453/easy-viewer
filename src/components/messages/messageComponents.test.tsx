import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MessageTable, { MessageCell } from "./MessageTable";
import { KAFKA_MESSAGE_CONFIG } from "./messageConfigs";
import ProduceMessageDialog from "./ProduceMessageDialog";

const noop = () => Promise.resolve();

describe("MessageCell", () => {
  it("正文列 JSON 走格式化 pre，时间列本地化", () => {
    const body = renderToStaticMarkup(
      <MessageCell
        value='{"a":1}'
        headerName="Value"
        bodyHeader="Value"
        timeHeader="Timestamp"
      />,
    );
    expect(body).toContain("<pre");
    expect(body).toContain("max-w-md overflow-x-auto");

    const time = renderToStaticMarkup(
      <MessageCell
        value="2024-01-02T03:04:05Z"
        headerName="Timestamp"
        bodyHeader="Value"
        timeHeader="Timestamp"
      />,
    );
    expect(time).toContain("2024");
  });

  it("空值输出占位符，普通列原样输出", () => {
    expect(
      renderToStaticMarkup(
        <MessageCell
          value={null}
          headerName="Value"
          bodyHeader="Value"
          timeHeader="Timestamp"
        />,
      ),
    ).toBe("-");

    expect(
      renderToStaticMarkup(
        <MessageCell
          value="hello"
          headerName="Key"
          bodyHeader="Value"
          timeHeader="Timestamp"
        />,
      ),
    ).toBe("hello");
  });
});

describe("MessageTable", () => {
  it("无数据时渲染空态引导文案", () => {
    const html = renderToStaticMarkup(
      <MessageTable
        headers={[]}
        rows={[]}
        config={KAFKA_MESSAGE_CONFIG}
        loading={false}
        error={null}
        searchTerm=""
        partitionFilter="all"
        onRetry={() => {}}
      />,
    );

    expect(html).toContain("暂无消息");
    expect(html).toContain("点击右上角「发送消息」生产第一条消息。");
  });
});

describe("ProduceMessageDialog", () => {
  it("关闭时不渲染", () => {
    const html = renderToStaticMarkup(
      <ProduceMessageDialog
        open={false}
        topicName="orders"
        connectionId={1}
        config={KAFKA_MESSAGE_CONFIG}
        onClose={() => {}}
        onSent={noop}
      />,
    );

    expect(html).toBe("");
  });

  it("打开时渲染标题、两个字段 id 与占位文案", () => {
    const html = renderToStaticMarkup(
      <ProduceMessageDialog
        open
        topicName="orders"
        connectionId={1}
        config={KAFKA_MESSAGE_CONFIG}
        onClose={() => {}}
        onSent={noop}
      />,
    );

    expect(html).toContain("发送消息到 orders");
    expect(html).toContain('id="message-meta"');
    expect(html).toContain('id="message-value"');
    expect(html).toContain("例如：user-id-123");
  });
});
