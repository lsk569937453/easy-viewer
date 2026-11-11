import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../types/tree";
import TreeSidebar from "./TreeSidebar";

// SSR 渲染只验证结构与文案：虚拟滚动的可视行依赖真实布局，在浏览器里验证
const noop = () => {};

const roots: TreeNode[] = [
  {
    id: 1,
    name: "本地 MySQL",
    type: "mysql",
    iconName: "mysql",
    icon: "ICON",
    description: "",
    version: "8.0.36",
    path: [{ level: 1, config_value: "1" }],
    children: [
      {
        id: "1/shop",
        name: "shop",
        type: "default",
        iconName: "database",
        description: "订单库",
        path: [
          { level: 1, config_value: "1" },
          { level: 2, config_value: "shop" },
        ],
        children: null,
      },
    ],
  },
  {
    id: 2,
    name: "对象存储",
    type: "s3",
    iconName: "s3",
    icon: "ICON",
    description: "",
    path: [{ level: 1, config_value: "2" }],
    children: null,
  },
];

const baseProps: ComponentProps<typeof TreeSidebar> = {
  roots,
  openNodes: {},
  selectedNodeId: null,
  onRowClick: noop,
  onToggle: noop,
  onAction: noop,
  nodeContextMenuItems: () => null,
  onEditConnection: noop,
  onDeleteConnection: noop,
};

describe("TreeSidebar", () => {
  it("渲染搜索框与可聚焦的 tree 容器", () => {
    const html = renderToStaticMarkup(<TreeSidebar {...baseProps} />);

    expect(html).toContain('placeholder="搜索节点..."');
    expect(html).toContain('role="tree"');
    expect(html).toContain('aria-label="导航树"');
    expect(html).toContain('tabindex="0"');
    // 未搜索时不显示计数条
    expect(html).not.toContain("项匹配");
  });

  it("SSR 期间（无布局信息）不抛错，也不输出任何行", () => {
    const html = renderToStaticMarkup(<TreeSidebar {...baseProps} />);
    expect(html).not.toContain("本地 MySQL");
  });
});
