import type {
  BaseConfigEnum,
  DatabaseHostStruct,
  RocketmqConfig,
  S3Struct,
  UiDbType,
  WebdavStruct,
} from "../types/backend";
import { UI_TO_BACKEND_DB_TYPE } from "../types/backend";
import { CONNECTION_URL_PARSERS } from "./connectionUrl";

export type ConnectionMode = "url" | "host";
export type TestResult = "success" | "failure" | null;

/** 新建/编辑连接表单的全部可编辑字段（原 17 个 useState 中的表单部分）。 */
export interface ConnectionDraft {
  connectionName: string;
  dbType: UiDbType;
  connectionMode: ConnectionMode;
  connectionString: string;
  host: string;
  port: string;
  username: string;
  password: string;
  databaseName: string;
  rmqTopics: string;
  useTls: boolean;
}

export type ValidationResult<T> =
  | { isValid: true; details: T }
  | { isValid: false; message: string };

export type HostValidation = ValidationResult<DatabaseHostStruct>;
export type KafkaValidation =
  | { isValid: true; broker: string }
  | { isValid: false; message: string };
export type S3Validation = ValidationResult<S3Struct>;
export type WebdavValidation = ValidationResult<WebdavStruct>;
export type RocketmqValidation = ValidationResult<RocketmqConfig>;

/** 「URL / Host」双模式可切换的传统数据库类型。 */
export const TRADITIONAL_DB_TYPES: readonly UiDbType[] = [
  "mysql",
  "oracle",
  "postgresql",
  "mongodb",
  "redis",
  "clickhouse",
  "elasticsearch",
];

/** Kafka 只需要 broker，用简化表单。 */
export const SIMPLE_BROKER_TYPES: readonly UiDbType[] = ["kafka"];

const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export const generateRandomString = (length: number): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += RANDOM_CHARS.charAt(
      Math.floor(Math.random() * RANDOM_CHARS.length),
    );
  }
  return result;
};

/** 切换数据库类型时的默认连接名：`<type>-<4 位随机串>`。 */
export const generateConnectionName = (dbType: UiDbType): string =>
  `${dbType}-${generateRandomString(4)}`;

/** 表单初始值（等价于原 resetForm 重置后的状态）。 */
export const createInitialDraft = (): ConnectionDraft => {
  const initialDbType = "sqlite";
  return {
    connectionName: generateConnectionName(initialDbType),
    dbType: initialDbType,
    connectionMode: "url",
    connectionString: "",
    host: "",
    port: "",
    username: "",
    password: "",
    databaseName: "",
    rmqTopics: "",
    useTls: true,
  };
};

export const getHostConnectionDetails = (
  draft: ConnectionDraft,
): HostValidation => {
  const cleanHost = draft.host.trim();
  const cleanPort = draft.port.trim();
  const cleanUsername = draft.username.trim();
  const cleanPassword = draft.password.trim();
  const cleanDatabaseName = draft.databaseName.trim();
  if (!cleanHost) return { isValid: false, message: "主机不能为空！" };
  const parsedPort = parseInt(cleanPort, 10);
  if (Number.isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return { isValid: false, message: "端口必须是有效的数字 (1-65535)！" };
  }
  // Redis and Elasticsearch typically don't require a username
  const usernameOptionalTypes = ["redis", "elasticsearch"];
  if (!usernameOptionalTypes.includes(draft.dbType) && !cleanUsername) {
    return { isValid: false, message: "用户名不能为空！" };
  }
  return {
    isValid: true,
    details: {
      host: cleanHost,
      port: parsedPort,
      user_name: cleanUsername,
      password: cleanPassword,
      database: cleanDatabaseName || (draft.dbType === "redis" ? "0" : ""),
    },
  };
};

export const getKafkaBrokerDetails = (
  draft: ConnectionDraft,
): KafkaValidation => {
  const cleanHost = draft.host.trim();
  const cleanPort = draft.port.trim();
  if (!cleanHost) return { isValid: false, message: "主机不能为空！" };
  const parsedPort = parseInt(cleanPort, 10) || 9092;
  return {
    isValid: true,
    broker: `${cleanHost}:${parsedPort}`,
  };
};

export const getS3ConnectionDetails = (
  draft: ConnectionDraft,
): S3Validation => {
  const cleanHost = draft.host.trim();
  const cleanPort = draft.port.trim();
  const cleanAccessKey = draft.username.trim();
  const cleanSecretKey = draft.password.trim();
  const cleanRegion = draft.databaseName.trim();
  if (!cleanHost) return { isValid: false, message: "Endpoint 不能为空！" };
  if (!cleanAccessKey)
    return { isValid: false, message: "Access Key 不能为空！" };
  if (!cleanSecretKey)
    return { isValid: false, message: "Secret Key 不能为空！" };
  const parsedPort = parseInt(cleanPort, 10) || 443;
  return {
    isValid: true,
    details: {
      host: cleanHost,
      port: parsedPort,
      access_key: cleanAccessKey,
      secret_key: cleanSecretKey,
      region: cleanRegion || "us-east-1",
    },
  };
};

export const getWebdavConnectionDetails = (
  draft: ConnectionDraft,
): WebdavValidation => {
  const cleanHost = draft.host.trim();
  const cleanPort = draft.port.trim();
  if (!cleanHost) return { isValid: false, message: "服务器地址不能为空！" };
  const parsedPort = parseInt(cleanPort, 10) || 443;
  if (Number.isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return { isValid: false, message: "端口必须是有效的数字 (1-65535)！" };
  }
  let cleanRootPath = draft.databaseName.trim();
  if (cleanRootPath && !cleanRootPath.startsWith("/")) {
    cleanRootPath = `/${cleanRootPath}`;
  }
  return {
    isValid: true,
    details: {
      host: cleanHost,
      port: parsedPort,
      username: draft.username.trim(),
      password: draft.password.trim(),
      root_path: cleanRootPath || "/",
      use_tls: draft.useTls,
    },
  };
};

export const getRocketmqConnectionDetails = (
  draft: ConnectionDraft,
): RocketmqValidation => {
  const cleanHost = draft.host.trim();
  if (!cleanHost) return { isValid: false, message: "Proxy 地址不能为空！" };
  const parsedPort = parseInt(draft.port.trim(), 10) || 8081;
  const proxyUrl = `${cleanHost}:${parsedPort}`;
  const topicsList = draft.rmqTopics
    .trim()
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return {
    isValid: true,
    details: {
      proxy_url: proxyUrl,
      access_key: draft.username.trim() || undefined,
      secret_key: draft.password.trim() || undefined,
      topics: topicsList,
    },
  };
};

export const isFormValid = (draft: ConnectionDraft): boolean => {
  if (draft.connectionName.trim() === "") return false;
  if (draft.dbType === "s3") {
    return getS3ConnectionDetails(draft).isValid;
  }
  if (draft.dbType === "webdav") {
    return getWebdavConnectionDetails(draft).isValid;
  }
  if (draft.dbType === "rocketmq") {
    return getRocketmqConnectionDetails(draft).isValid;
  }
  if (SIMPLE_BROKER_TYPES.includes(draft.dbType)) {
    return getKafkaBrokerDetails(draft).isValid;
  }
  if (draft.connectionMode === "url") {
    return draft.connectionString.trim() !== "";
  }
  return getHostConnectionDetails(draft).isValid;
};

/** 保存与测试两条路径的历史差异：测试不做 trim（保持原有报错行为）。 */
export type ConfigBuildMode = "save" | "test";

const buildUrlDetails = (
  draft: ConnectionDraft,
  mode: ConfigBuildMode,
): DatabaseHostStruct => {
  if (mode === "test" && !draft.connectionString.trim()) {
    throw new Error("连接字符串不能为空，无法测试！");
  }
  const url =
    mode === "save" ? draft.connectionString.trim() : draft.connectionString;
  const parse = CONNECTION_URL_PARSERS[draft.dbType];
  if (!parse) {
    throw new Error(
      mode === "save"
        ? `不支持的数据库类型: ${draft.dbType}`
        : `URL模式暂不支持 ${draft.dbType} 类型数据库的后端解析测试。`,
    );
  }
  return parse(url);
};

/** 由表单草稿构建后端 `base_config_enum`，保存与测试共用。 */
export const buildBaseConfigEnum = (
  draft: ConnectionDraft,
  mode: ConfigBuildMode,
): BaseConfigEnum => {
  if (draft.dbType === "sqlite") {
    const filePath = draft.connectionString.trim();
    if (mode === "test" && !filePath) {
      throw new Error("请选择一个数据库文件！");
    }
    return { sqlite: { file_path: filePath } };
  }
  if (draft.dbType === "s3") {
    const result = getS3ConnectionDetails(draft);
    if (!result.isValid) throw new Error(result.message);
    return { s3: { config: result.details } };
  }
  if (draft.dbType === "webdav") {
    const result = getWebdavConnectionDetails(draft);
    if (!result.isValid) throw new Error(result.message);
    return { webdav: { config: result.details } };
  }
  if (draft.dbType === "rocketmq") {
    const result = getRocketmqConnectionDetails(draft);
    if (!result.isValid) throw new Error(result.message);
    return { rocketmq: result.details };
  }
  if (SIMPLE_BROKER_TYPES.includes(draft.dbType)) {
    const result = getKafkaBrokerDetails(draft);
    if (!result.isValid) throw new Error(result.message);
    return { [UI_TO_BACKEND_DB_TYPE[draft.dbType]]: { broker: result.broker } };
  }
  if (draft.connectionMode === "url") {
    return {
      [UI_TO_BACKEND_DB_TYPE[draft.dbType]]: {
        config: buildUrlDetails(draft, mode),
      },
    };
  }
  const result = getHostConnectionDetails(draft);
  if (!result.isValid) throw new Error(result.message);
  return { [UI_TO_BACKEND_DB_TYPE[draft.dbType]]: { config: result.details } };
};
