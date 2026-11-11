import type { DatabaseHostStruct, UiDbType } from "../types/backend";

export type UrlParser = (url: string) => DatabaseHostStruct;

/**
 * 7 个连接 URL 解析器共享同一套「可选 user:password@ + host:port + 可选库名」结构，
 * 差异只有协议前缀、默认端口与报错文案，因此用工厂生成，避免复制粘贴。
 * 注意：正则里端口段是必填的，默认端口只在端口段解析失败时兜底。
 */
const createUrlParser = (
  pattern: RegExp,
  defaultPort: number,
  invalidMessage: string,
): UrlParser => {
  return (url: string) => {
    const match = url.match(pattern);
    if (!match) throw new Error(invalidMessage);
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || defaultPort,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };
};

export const parseMysqlUrl: UrlParser = createUrlParser(
  /^mysql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/,
  3306,
  "无效的 MySQL URL 格式。",
);

export const parseOracleUrl: UrlParser = createUrlParser(
  /^oracle:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/,
  1521,
  "无效的 Oracle URL 格式。",
);

export const parsePostgresqlUrl: UrlParser = createUrlParser(
  /^postgresql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/,
  5432,
  "无效的 PostgreSQL URL 格式。",
);

export const parseMongodbUrl: UrlParser = createUrlParser(
  /^mongodb:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/,
  27017,
  "无效的 MongoDB URL 格式。",
);

export const parseRedisUrl: UrlParser = createUrlParser(
  /^redis:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/(\d+))?$/,
  6379,
  "无效的 Redis URL 格式。",
);

export const parseClickhouseUrl: UrlParser = createUrlParser(
  /^clickhouse:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/,
  8123,
  "无效的 ClickHouse URL 格式。",
);

export const parseElasticsearchUrl: UrlParser = createUrlParser(
  /^https?:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/,
  9200,
  "无效的 Elasticsearch URL 格式。",
);

/** URL 模式支持解析的数据库类型。 */
export const CONNECTION_URL_PARSERS: Partial<Record<UiDbType, UrlParser>> = {
  mysql: parseMysqlUrl,
  oracle: parseOracleUrl,
  postgresql: parsePostgresqlUrl,
  mongodb: parseMongodbUrl,
  redis: parseRedisUrl,
  clickhouse: parseClickhouseUrl,
  elasticsearch: parseElasticsearchUrl,
};

/** URL 输入框占位文案：与原 `getUrlPlaceholder()` 的 switch 输出一致。 */
export const getUrlPlaceholder = (dbType: UiDbType): string => {
  switch (dbType) {
    case "mysql":
      return "例如: mysql://user:password@host:port/database_name";
    case "oracle":
      return "例如: oracle://user:password@host:port/service_name";
    case "postgresql":
      return "例如: postgresql://user:password@host:port/database_name";
    case "mongodb":
      return "例如: mongodb://user:password@host:port/database_name";
    case "redis":
      return "例如: redis://password@host:port/db_index";
    case "clickhouse":
      return "例如: clickhouse://user:password@host:port/database";
    case "elasticsearch":
      return "例如: http://user:password@host:port";
    case "kafka":
      return "例如: kafka://host:port";
    default:
      return "请输入连接字符串";
  }
};
