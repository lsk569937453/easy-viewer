import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Tab } from "../../types/tab";
import {
  renderTabContent,
  TAB_CONTENT_RENDERERS,
  type TabContentContext,
} from "./tabContentRegistry";

const context: TabContentContext = {
  connections: [],
  setTabs: () => {},
  setActiveTabId: () => {},
};

const tabTypes: Tab["type"][] = [
  "sqlEditor",
  "tableDetail",
  "singleTable",
  "indexDetail",
  "columnDetail",
  "kafkaMessages",
  "kafkaTopicDetail",
  "rocketmqMessages",
  "redisConsole",
  "redisKeyDetail",
  "esIndexBrowser",
  "s3Upload",
  "s3Object",
  "info",
];

describe("tabContentRegistry", () => {
  it("为所有标签类型注册渲染器", () => {
    expect(Object.keys(TAB_CONTENT_RENDERERS).sort()).toEqual(
      [...tabTypes].sort(),
    );
  });

  it("info 兜底页渲染名称与详情", () => {
    const tab: Tab = {
      id: "info-1",
      name: "订单表",
      type: "info",
      details: "表说明",
    };

    const html = renderToStaticMarkup(renderTabContent(tab, context));

    expect(html).toContain("订单表");
    expect(html).toContain("表说明");
  });

  it("info 无详情时展示默认文案", () => {
    const tab: Tab = { id: "info-2", name: "说明", type: "info" };

    const html = renderToStaticMarkup(renderTabContent(tab, context));

    expect(html).toContain("暂无详细描述。");
  });
});
