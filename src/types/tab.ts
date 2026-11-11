import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ConnectionSummary } from "./backend";
import type { TreeNode, TreeNodeId, TreeNodePathSegment } from "./tree";

interface TabBase {
  id: string;
  name: string;
  icon?: ReactNode;
  details?: string;
}

export interface SqlEditorTab extends TabBase {
  type: "sqlEditor";
  connectionId: number;
  queryId?: string | number | null;
  databaseName?: string | null;
  initialSql?: string | null;
  isDirty?: boolean;
  sourceNodeId?: TreeNodeId;
}

export interface S3ObjectTab extends TabBase {
  type: "s3Object";
  node: TreeNode;
}

export interface S3UploadTab extends TabBase {
  type: "s3Upload";
  node: TreeNode;
}

export interface RedisKeyDetailTab extends TabBase {
  type: "redisKeyDetail";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
}

export interface EsIndexBrowserTab extends TabBase {
  type: "esIndexBrowser";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
}

export interface SingleTableTab extends TabBase {
  type: "singleTable";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
  initialSql: string;
  iconName?: string;
  path?: TreeNodePathSegment[];
}

export interface IndexDetailTab extends TabBase {
  type: "indexDetail";
  node: TreeNode;
  tableName?: string;
}

export interface ColumnDetailTab extends TabBase {
  type: "columnDetail";
  node: TreeNode;
  tableName?: string;
  iconName?: string;
}

export interface TableDetailTab extends TabBase {
  type: "tableDetail";
  node: TreeNode;
  defaultTab?: string;
  connectionId?: number;
}

export interface KafkaMessagesTab extends TabBase {
  type: "kafkaMessages";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
}

export interface KafkaTopicDetailTab extends TabBase {
  type: "kafkaTopicDetail";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
}

export interface RocketmqMessagesTab extends TabBase {
  type: "rocketmqMessages";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
}

export interface RedisConsoleTab extends TabBase {
  type: "redisConsole";
  node: TreeNode;
  connectionDetails: ConnectionSummary;
}

/** 兜底信息页（当前代码路径未创建，保留 TabPanel 的默认渲染分支）。 */
export interface InfoTab extends TabBase {
  type: "info";
  node?: TreeNode;
}

export type Tab =
  | SqlEditorTab
  | S3ObjectTab
  | S3UploadTab
  | RedisKeyDetailTab
  | EsIndexBrowserTab
  | SingleTableTab
  | IndexDetailTab
  | ColumnDetailTab
  | TableDetailTab
  | KafkaMessagesTab
  | KafkaTopicDetailTab
  | RocketmqMessagesTab
  | RedisConsoleTab
  | InfoTab;

export type SetTabs = Dispatch<SetStateAction<Tab[]>>;
export type SetActiveTabId = Dispatch<SetStateAction<string | null>>;
