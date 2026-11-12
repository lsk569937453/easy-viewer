/**
 * 后端（src-tauri）serde 契约类型。
 * 所有字段以 Rust 结构为准：`src-tauri/src/vojo/**`、`src-tauri/src/service/cmd.rs`、
 * `src-tauri/src/service/base_config_service.rs`。
 * 前端不得单方面给这里补后端未返回的字段；字段缺失时应修调用方。
 */

import { DATABASE_TYPES, type DatabaseTypeId } from "./generated/databaseTypes";

/** 后端统一错误信封（`code` + 中文 message + 脱敏 detail + 是否可重试）。 */
export interface BackendErrorInfo {
  /** 稳定错误码，形如 `EV-CONN-0001`；只允许追加，禁止改语义。 */
  code: string;
  /** 面向用户的中文提示。 */
  message: string;
  /** 驱动原文（已脱敏、截断），可用于展开诊断。 */
  detail: string | null;
  /** 是否值得直接重试。 */
  retryable: boolean;
}

/** `reply!`：成功 code=0 + T；失败 code=1 + String，并附带结构化 `error`。 */
export type BaseResponse<T> =
  | { response_code: 0; response_msg: T }
  | { response_code: 1; response_msg: string; error?: BackendErrorInfo };

export interface GetBaseConnectionResponseItem {
  base_config_id: number;
  connection_name: string;
  connection_type: number;
  description: string;
}

export interface GetBaseConnectionResponse {
  base_config_list: GetBaseConnectionResponseItem[];
}

export interface GetBaseConnectionByIdResponse {
  base_config_id: number;
  connection_name: string;
  connection_json: string;
  connection_type: number;
  description: string;
}

/** App 持有的连接摘要（列表项 + 由前端派生的 host/port）。 */
export interface ConnectionSummary extends GetBaseConnectionResponseItem {
  host: string | null;
  port: number | null;
}

/**
 * 后端数据源标识：直接复用 YAML 描述符生成的 `DatabaseTypeId`，
 * 不再手写 13 项字面量联合 —— 新增数据源只改 YAML。
 */
export type BackendDbType = DatabaseTypeId;

/** 前端下拉框/树节点使用的数据库类型；Oracle 后端 serde tag 为 `oracledb`。 */
export type UiDbType =
  | "mysql"
  | "postgresql"
  | "kafka"
  | "sqlite"
  | "mongodb"
  | "oracle"
  | "mssql"
  | "clickhouse"
  | "s3"
  | "redis"
  | "elasticsearch"
  | "rocketmq"
  | "webdav";

/** 前端数据源标识清单：由 YAML 描述符生成，不再手写 13 项。 */
export const BACKEND_DB_TYPES: readonly BackendDbType[] = DATABASE_TYPES.map(
  (item) => item.dbType,
);

export function isBackendDbType(value: string): value is BackendDbType {
  return BACKEND_DB_TYPES.some((type) => type === value);
}

export const UI_DB_TYPES: readonly UiDbType[] = [
  "mysql",
  "postgresql",
  "kafka",
  "sqlite",
  "mongodb",
  "oracle",
  "mssql",
  "clickhouse",
  "s3",
  "redis",
  "elasticsearch",
  "rocketmq",
  "webdav",
];

export function isUiDbType(value: string): value is UiDbType {
  return UI_DB_TYPES.some((type) => type === value);
}

export const UI_TO_BACKEND_DB_TYPE: Record<UiDbType, BackendDbType> = {
  mysql: "mysql",
  postgresql: "postgresql",
  kafka: "kafka",
  sqlite: "sqlite",
  mongodb: "mongodb",
  oracle: "oracledb",
  mssql: "mssql",
  clickhouse: "clickhouse",
  s3: "s3",
  redis: "redis",
  elasticsearch: "elasticsearch",
  rocketmq: "rocketmq",
  webdav: "webdav",
};

export const BACKEND_TO_UI_DB_TYPE: Record<BackendDbType, UiDbType> = {
  mysql: "mysql",
  postgresql: "postgresql",
  kafka: "kafka",
  sqlite: "sqlite",
  mongodb: "mongodb",
  oracledb: "oracle",
  mssql: "mssql",
  clickhouse: "clickhouse",
  s3: "s3",
  redis: "redis",
  elasticsearch: "elasticsearch",
  rocketmq: "rocketmq",
  webdav: "webdav",
};

/**
 * `connection_type`（后端 i32）→ 前端展示类型。
 *
 * 由 YAML 描述符推导，不再手写 0..12 的映射表：数值与类型的对应关系
 * 只在 `src-tauri/plugins/connection-types/*.yaml` 里维护一份。
 */
export const CONNECTION_TYPE_TO_DB_TYPE: Record<number, UiDbType> =
  Object.fromEntries(
    DATABASE_TYPES.map((item) => [
      item.connectionType,
      BACKEND_TO_UI_DB_TYPE[item.dbType],
    ]),
  );

export interface DatabaseHostStruct {
  host: string;
  database?: string | null;
  user_name: string;
  password: string;
  port: number;
}

export interface SqliteConfig {
  file_path: string;
}

export interface KafkaConfig {
  broker: string;
  security_protocol?: string;
  sasl_mechanism?: string;
  sasl_username?: string;
  sasl_password?: string;
}

export interface S3Struct {
  host: string;
  port: number;
  access_key: string;
  secret_key: string;
  region: string;
}

export interface S3Config {
  config: S3Struct;
}

export interface WebdavStruct {
  host: string;
  port: number;
  username: string;
  password: string;
  root_path: string;
  use_tls: boolean;
}

export interface WebdavConfig {
  config: WebdavStruct;
}

export interface RocketmqConfig {
  proxy_url: string;
  access_key?: string;
  secret_key?: string;
  topics: string[];
}

export interface HostConfig {
  config: DatabaseHostStruct;
}

export type ConnectionConfigEntry =
  | HostConfig
  | S3Config
  | WebdavConfig
  | KafkaConfig
  | RocketmqConfig
  | SqliteConfig;

/**
 * `BaseConfigEnum` 是 serde 的单键枚举。索引签名允许按动态 key 构造/读取，
 * 各具名可选属性提供编辑回填时的精确类型。
 */
export interface BaseConfigEnum {
  [key: string]: ConnectionConfigEntry | undefined;
  mysql?: HostConfig;
  postgresql?: HostConfig;
  mongodb?: HostConfig;
  oracledb?: HostConfig;
  mssql?: HostConfig;
  clickhouse?: HostConfig;
  redis?: HostConfig;
  elasticsearch?: HostConfig;
  sqlite?: SqliteConfig;
  kafka?: KafkaConfig;
  s3?: S3Config;
  webdav?: WebdavConfig;
  rocketmq?: RocketmqConfig;
}

export interface BaseConfig {
  base_config_enum: BaseConfigEnum;
}

export interface SaveConnectionRequest {
  base_config: BaseConfig;
  connection_name: string;
}

export interface UpdateConnectionRequest extends SaveConnectionRequest {
  connection_id: number;
}

export interface ListNodeInfoReqItem {
  level: number;
  config_value: string;
}

export interface ListNodeInfoReq {
  level_infos: ListNodeInfoReqItem[];
}

export interface ListNodeInfoResponseItem {
  id: string;
  show_first_icon: boolean;
  show_second_icon: boolean;
  icon_name: string;
  name: string;
  description: string | null;
}

export interface ListNodeInfoResponse {
  list: ListNodeInfoResponseItem[];
}

export interface SqlHeader {
  name: string;
  type_name: string;
  is_primary_key: boolean;
}

export interface ExeSqlResponse {
  header: SqlHeader[];
  rows: (string | null)[][];
  table_name?: string | null;
  total_count?: number;
}

export interface ShowColumnHeader {
  name: string;
  type_name: string;
}

export interface ShowColumnsResponse {
  header: ShowColumnHeader[];
  rows: (string | null)[][];
}

export interface GetObjectInfoRes {
  name: string;
  size: string;
  last_modified: string;
  etag: string;
  content_type: string;
}

export type ColumnTypeFlag = "Date" | "Common";

export interface GetColumnInfoForInsertSqlResponseItem {
  column_name: string;
  column_type: string;
  type_flag: ColumnTypeFlag;
  is_primary: boolean;
}

export interface GetColumnInfoForInsertSqlResponse {
  list: GetColumnInfoForInsertSqlResponseItem[];
}

export interface RedisCommandResponse {
  response_type: string;
  value?: string | null;
  array_items?: string[] | null;
  execution_time_ms: number;
}

/** list_local_folder_files 直接返回 JSON 字符串数组（非 BaseResponse）。 */
export type LocalFolderFiles = string[];
