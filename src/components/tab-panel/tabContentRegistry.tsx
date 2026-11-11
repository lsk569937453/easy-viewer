import type { ReactNode } from "react";
import type { ConnectionSummary } from "../../types/backend";
import type { SetActiveTabId, SetTabs, Tab } from "../../types/tab";
import type { TreeNode } from "../../types/tree";
import ColumnDetailPage from "../ColumnDetailPage";
import ElasticsearchIndexPanel from "../ElasticsearchIndexPanel";
import IndexDetailPage from "../IndexDetailPage";
import KafkaMessagesPanel from "../KafkaMessagesPanel";
import KafkaTopicDetail from "../KafkaTopicDetail";
import RedisConsolePanel from "../RedisConsolePanel";
import RedisKeyDetailPanel from "../RedisKeyDetailPanel";
import RocketmqMessagesPanel from "../RocketmqMessagesPanel";
import S3ObjectPanel from "../S3ObjectPanel";
import S3UploadPanel from "../S3UploadPanel";
import SqlEditorTabContent from "../SqlEditorTabContent";
import TableDetailPage from "../TableDetailPage";
import TableWorkspacePanel from "../TableWorkspacePanel";

/** 内容区分发所需的回调与状态，全部由 TabPanel 透传。 */
export interface TabContentContext {
  connections: ConnectionSummary[];
  setTabs: SetTabs;
  setActiveTabId: SetActiveTabId;
  onQuerySaved?: (queryId: string, newName: string) => void;
  onRedisKeyDeleted?: (node: TreeNode) => void;
  onKafkaTopicDeleted?: (node: TreeNode) => void;
}

type TabRenderer<K extends Tab["type"]> = (
  tab: Extract<Tab, { type: K }>,
  context: TabContentContext,
) => ReactNode;

type TabRendererRegistry = { [K in Tab["type"]]: TabRenderer<K> };

/**
 * `Tab["type"]` → 内容组件的映射表。
 * 每个分支的 props 与拆分前完全一致（tableDetail 的 connections.find 就地查询）。
 */
export const TAB_CONTENT_RENDERERS: TabRendererRegistry = {
  sqlEditor: (tab, context) => (
    <SqlEditorTabContent
      tab={tab}
      connections={context.connections}
      setTabs={context.setTabs}
      setActiveTabId={context.setActiveTabId}
      onQuerySaved={context.onQuerySaved}
    />
  ),
  tableDetail: (tab, context) => {
    const activeNode = tab.node;
    const rootConfigId = activeNode.path[0].config_value;
    const connection = context.connections.find(
      (conn) => conn.base_config_id.toString() === rootConfigId,
    );

    return (
      <TableDetailPage
        activeTabNode={activeNode}
        connectionDetails={connection}
        defaultTab={tab.defaultTab}
      />
    );
  },
  singleTable: (tab) => (
    <TableWorkspacePanel
      initialSql={tab.initialSql}
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
    />
  ),
  indexDetail: (tab) => (
    <IndexDetailPage activeTabNode={tab.node} tableName={tab.tableName} />
  ),
  columnDetail: (tab) => (
    <ColumnDetailPage activeTabNode={tab.node} tableName={tab.tableName} />
  ),
  kafkaMessages: (tab) => (
    <KafkaMessagesPanel
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
    />
  ),
  kafkaTopicDetail: (tab, context) => (
    <KafkaTopicDetail
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
      onTopicDeleted={context.onKafkaTopicDeleted}
    />
  ),
  rocketmqMessages: (tab) => (
    <RocketmqMessagesPanel
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
    />
  ),
  redisConsole: (tab) => (
    <RedisConsolePanel
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
    />
  ),
  redisKeyDetail: (tab, context) => (
    <RedisKeyDetailPanel
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
      onKeyDeleted={context.onRedisKeyDeleted}
    />
  ),
  esIndexBrowser: (tab) => (
    <ElasticsearchIndexPanel
      activeTabNode={tab.node}
      connectionDetails={tab.connectionDetails}
    />
  ),
  s3Upload: (tab) => <S3UploadPanel tab={tab} />,
  s3Object: (tab) => <S3ObjectPanel tab={tab} />,
  info: (tab) => (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-primary flex items-center">
        {tab.icon && <span className="mr-3">{tab.icon}</span>}
        {tab.name}
      </h1>
      <div className="divider"></div>
      <pre className="text-base-content/80 whitespace-pre-wrap bg-base-200 p-4 rounded-md">
        {tab.details || "暂无详细描述。"}
      </pre>
    </div>
  ),
};

/** 按标签类型取对应渲染器；类型收窄交给注册表的映射类型。 */
export const renderTabContent = (
  tab: Tab,
  context: TabContentContext,
): ReactNode =>
  (TAB_CONTENT_RENDERERS[tab.type] as TabRenderer<Tab["type"]>)(tab, context);
