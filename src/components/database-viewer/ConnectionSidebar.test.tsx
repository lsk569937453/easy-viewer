import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConnectionSummary } from "../../types/backend";
import ConnectionSidebar from "./ConnectionSidebar";

const noop = () => {};

const connections: ConnectionSummary[] = [
  {
    base_config_id: 1,
    connection_name: "本地 MySQL",
    connection_type: 0,
    description: "",
    host: "127.0.0.1",
    port: 3306,
  },
];

const baseProps: ComponentProps<typeof ConnectionSidebar> = {
  connections,
  isRefreshing: false,
  treeData: [],
  openNodes: {},
  selectedNodeId: null,
  onCreateConnection: noop,
  onRowClick: noop,
  onToggle: noop,
  onAction: noop,
  onEditConnection: noop,
  onDeleteConnection: noop,
  nodeContextMenuItems: () => null,
};

describe("ConnectionSidebar", () => {
  it("渲染连接计数、新建连接入口与空状态文案", () => {
    const html = renderToStaticMarkup(<ConnectionSidebar {...baseProps} />);

    expect(html).toContain("连接");
    expect(html).toContain('aria-label="新建连接"');
    expect(html).toContain("还没有连接");
    expect(html).toContain("添加 MySQL、Redis、Kafka 或 S3 连接");
  });

  it("刷新探测期间渲染覆盖层文案", () => {
    const html = renderToStaticMarkup(
      <ConnectionSidebar {...baseProps} isRefreshing />,
    );

    expect(html).toContain("正在检测连接状态…");
  });
});
