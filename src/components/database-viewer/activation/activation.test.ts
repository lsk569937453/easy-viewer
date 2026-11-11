import { describe, expect, it } from "vitest";
import type { ConnectionSummary } from "../../../types/backend";
import type { Tab } from "../../../types/tab";
import type { TreeNode } from "../../../types/tree";
import type { NodeActivationArgs } from "./context";
import { activateKafkaNode } from "./kafka";
import { activateRedisNode } from "./redis";
import { activateSavedQueryNode } from "./sqlNodes";

const connection: ConnectionSummary = {
  base_config_id: 1,
  connection_name: "本地 MySQL",
  connection_type: 0,
  description: "",
  host: "127.0.0.1",
  port: 3306,
};

const makeNode = (overrides: Partial<TreeNode>): TreeNode => ({
  id: "1/table",
  name: "table",
  type: "default",
  path: [{ level: 1, config_value: "1" }],
  ...overrides,
});

interface Harness {
  getTabs: () => Tab[];
  getActiveTabId: () => string | null;
  toggles: TreeNode[];
  args: Omit<NodeActivationArgs, "node" | "connection">;
}

const createHarness = (initialTabs: Tab[] = []): Harness => {
  let tabs = initialTabs;
  let activeTabId: string | null = null;
  const toggles: TreeNode[] = [];

  const args: Omit<NodeActivationArgs, "node" | "connection"> = {
    get tabs() {
      return tabs;
    },
    setTabs: (update) => {
      tabs = typeof update === "function" ? update(tabs) : update;
    },
    setActiveTabId: (update) => {
      activeTabId = typeof update === "function" ? update(activeTabId) : update;
    },
    connections: [connection],
    openSqlEditorTabWithContent: async () => true,
    handleToggleNode: async (node) => {
      toggles.push(node);
    },
  };

  return {
    getTabs: () => tabs,
    getActiveTabId: () => activeTabId,
    toggles,
    args,
  };
};

describe("activation payloads", () => {
  it("打开已保存查询时创建 sqlEditor tab，并带上 sourceNodeId", async () => {
    const harness = createHarness();
    const node = makeNode({
      id: "1/q5",
      name: "订单查询",
      iconName: "singleQuery",
      path: [
        { level: 1, config_value: "1" },
        { level: 2, config_value: "shop" },
        { level: 3, config_value: "5" },
      ],
    });

    await activateSavedQueryNode({
      ...harness.args,
      node,
      connection,
    });

    expect(harness.getActiveTabId()).toBe("sql-editor-5");
    expect(harness.getTabs()).toHaveLength(1);
    expect(harness.getTabs()[0]).toMatchObject({
      id: "sql-editor-5",
      name: "订单查询",
      type: "sqlEditor",
      connectionId: 1,
      queryId: "5",
      databaseName: "shop",
      initialSql: null,
      isDirty: false,
      sourceNodeId: "1/q5",
    });
  });

  it("已存在同一 queryId 的 tab 时只激活，不重复创建", async () => {
    const existing: Tab = {
      id: "sql-editor-5",
      name: "旧查询",
      type: "sqlEditor",
      connectionId: 1,
      queryId: "5",
    };
    const harness = createHarness([existing]);
    const node = makeNode({
      id: "1/q5",
      iconName: "singleQuery",
      path: [
        { level: 1, config_value: "1" },
        { level: 3, config_value: "5" },
      ],
    });

    await activateSavedQueryNode({ ...harness.args, node, connection });

    expect(harness.getActiveTabId()).toBe("sql-editor-5");
    expect(harness.getTabs()).toHaveLength(1);
  });

  it("Redis key 节点创建 redisKeyDetail 并切换展开态", async () => {
    const harness = createHarness();
    const node = makeNode({
      id: "1/user:1",
      name: "user:1",
      iconName: "singleTable",
    });

    await activateRedisNode({
      ...harness.args,
      node,
      connection: { ...connection, connection_type: 9 },
    });

    expect(harness.getActiveTabId()).toBe("redis-key-1/user:1");
    expect(harness.getTabs()[0]).toMatchObject({
      type: "redisKeyDetail",
      name: "user:1",
    });
    expect(harness.toggles).toEqual([node]);
  });

  it("Kafka messages 节点创建消息 tab 并切换展开态", async () => {
    const harness = createHarness();
    const node = makeNode({
      id: "1/topic-a",
      name: "messages",
      iconName: "kafka_messages",
      path: [
        { level: 1, config_value: "1" },
        { level: 2, config_value: "topic-a" },
        { level: 3, config_value: "messages" },
      ],
    });

    await activateKafkaNode({ ...harness.args, node, connection });

    expect(harness.getTabs()[0]).toMatchObject({
      id: "kafka-messages-1/topic-a",
      name: "messages - Messages",
      type: "kafkaMessages",
    });
    expect(harness.toggles).toEqual([node]);
  });
});
