import {
  BACKEND_TO_UI_DB_TYPE,
  type GetBaseConnectionByIdResponse,
  isBackendDbType,
} from "../../types/backend";
import { parseConnectionConfig } from "../../utils/backendResponse";
import type { ConnectionDraft } from "../../utils/connectionForm";

export interface PopulatedDraft {
  patch: Partial<ConnectionDraft>;
  error?: string;
}

/**
 * 编辑模式回填：把 `get_base_config_by_id` 返回的 `connection_json` 转成表单补丁。
 * 与原内联逻辑一致：即使类型无法识别，连接名称也已回填后才报错。
 */
export const draftFromConnectionConfig = (
  responseMsg: GetBaseConnectionByIdResponse,
): PopulatedDraft => {
  const baseConfigEnum = parseConnectionConfig(
    responseMsg.connection_json,
  ).base_config_enum;
  const patch: Partial<ConnectionDraft> = {
    connectionName: responseMsg.connection_name,
  };
  const dbTypeKey = Object.keys(baseConfigEnum).find(isBackendDbType);
  if (!dbTypeKey) {
    return { patch, error: "获取连接信息失败: 无法识别的连接类型" };
  }
  patch.dbType = BACKEND_TO_UI_DB_TYPE[dbTypeKey];

  if (dbTypeKey === "sqlite") {
    patch.connectionMode = "url";
    patch.connectionString = baseConfigEnum.sqlite?.file_path ?? "";
    patch.host = "";
    patch.port = "";
    patch.username = "";
    patch.password = "";
    patch.databaseName = "";
  } else if (dbTypeKey === "kafka") {
    // Kafka: 解析 broker 地址 "host:port"
    const broker = baseConfigEnum.kafka?.broker ?? "";
    const parts = broker.split(":");
    patch.host = parts[0] || "";
    patch.port = parts[1] || "9092";
    patch.connectionMode = "host";
    patch.connectionString = "";
    patch.username = "";
    patch.password = "";
    patch.databaseName = "";
  } else if (dbTypeKey === "s3") {
    // S3 / OSS: access_key / secret_key / region
    const config = baseConfigEnum.s3?.config;
    patch.host = config?.host || "";
    patch.port = config?.port ? String(config.port) : "443";
    patch.username = config?.access_key || "";
    patch.password = config?.secret_key || "";
    patch.databaseName = config?.region || "";
    patch.connectionMode = "host";
    patch.connectionString = "";
  } else if (dbTypeKey === "webdav") {
    // WebDAV: host / port / username / password / root_path / use_tls
    const config = baseConfigEnum.webdav?.config;
    patch.host = config?.host || "";
    patch.port = config?.port ? String(config.port) : "443";
    patch.username = config?.username || "";
    patch.password = config?.password || "";
    patch.databaseName = config?.root_path || "";
    patch.useTls = config?.use_tls !== false;
    patch.connectionMode = "host";
    patch.connectionString = "";
  } else if (dbTypeKey === "rocketmq") {
    // RocketMQ: proxy_url, access_key, secret_key, topics
    const config = baseConfigEnum.rocketmq;
    const proxyUrl = config?.proxy_url || "";
    const parts = proxyUrl.split(":");
    patch.host = parts[0] || "";
    patch.port = parts[1] || "8081";
    patch.username = config?.access_key || "";
    patch.password = config?.secret_key || "";
    patch.rmqTopics = (config?.topics || []).join(", ");
    patch.connectionMode = "host";
    patch.connectionString = "";
    patch.databaseName = "";
  } else {
    // 其余传统数据库（mysql / oracle / ...）
    const entry = baseConfigEnum[dbTypeKey];
    if (entry && "config" in entry && "user_name" in entry.config) {
      const config = entry.config;
      patch.host = config.host || "";
      patch.port = config.port ? String(config.port) : "";
      patch.username = config.user_name || "";
      patch.password = config.password || "";
      patch.databaseName = config.database || "";
    }
    // 编辑时默认 Host 模式，字段展示更直观
    patch.connectionMode = "host";
    patch.connectionString = "";
  }
  return { patch };
};
