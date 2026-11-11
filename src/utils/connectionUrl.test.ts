import { describe, expect, it } from "vitest";
import {
  getUrlPlaceholder,
  parseClickhouseUrl,
  parseElasticsearchUrl,
  parseMongodbUrl,
  parseMysqlUrl,
  parseOracleUrl,
  parsePostgresqlUrl,
  parseRedisUrl,
} from "./connectionUrl";

describe("连接 URL 解析器", () => {
  it("MySQL：带账号、端口与库名", () => {
    expect(parseMysqlUrl("mysql://root:secret@db.local:3306/app")).toEqual({
      host: "db.local",
      port: 3306,
      database: "app",
      user_name: "root",
      password: "secret",
    });
  });

  it("Oracle：service_name 落到 database", () => {
    expect(parseOracleUrl("oracle://system:oracle@db.local:1521/ORCL")).toEqual(
      {
        host: "db.local",
        port: 1521,
        database: "ORCL",
        user_name: "system",
        password: "oracle",
      },
    );
  });

  it("PostgreSQL：解析密码与库名", () => {
    expect(
      parsePostgresqlUrl("postgresql://postgres:pg@db.local:5433/appdb"),
    ).toEqual({
      host: "db.local",
      port: 5433,
      database: "appdb",
      user_name: "postgres",
      password: "pg",
    });
  });

  it("MongoDB：默认端口之外的显式端口", () => {
    expect(
      parseMongodbUrl("mongodb://mongo:pass@db.local:27017/appdb"),
    ).toEqual({
      host: "db.local",
      port: 27017,
      database: "appdb",
      user_name: "mongo",
      password: "pass",
    });
  });

  it("Redis：database 为库索引", () => {
    expect(parseRedisUrl("redis://default:rpass@db.local:6380/2")).toEqual({
      host: "db.local",
      port: 6380,
      database: "2",
      user_name: "default",
      password: "rpass",
    });
  });

  it("ClickHouse：解析库名", () => {
    expect(
      parseClickhouseUrl("clickhouse://default:ck@db.local:8123/analytics"),
    ).toEqual({
      host: "db.local",
      port: 8123,
      database: "analytics",
      user_name: "default",
      password: "ck",
    });
  });

  it("Elasticsearch：http/https 前缀均可", () => {
    expect(
      parseElasticsearchUrl("https://es:pass@es.local:9200/index"),
    ).toEqual({
      host: "es.local",
      port: 9200,
      database: "index",
      user_name: "es",
      password: "pass",
    });
    expect(parseElasticsearchUrl("http://es.local:9200").host).toBe("es.local");
  });

  it("格式不合法时抛出带类型名的错误", () => {
    expect(() => parseMysqlUrl("not-a-url")).toThrow("无效的 MySQL URL 格式。");
    expect(() => parseOracleUrl("mysql://host:1521")).toThrow(
      "无效的 Oracle URL 格式。",
    );
    expect(() => parsePostgresqlUrl("postgresql://host")).toThrow(
      "无效的 PostgreSQL URL 格式。",
    );
    expect(() => parseMongodbUrl("mongodb://")).toThrow(
      "无效的 MongoDB URL 格式。",
    );
    expect(() => parseRedisUrl("redis://host:6379/not-a-number")).toThrow(
      "无效的 Redis URL 格式。",
    );
    expect(() => parseClickhouseUrl("clickhouse://host:port")).toThrow(
      "无效的 ClickHouse URL 格式。",
    );
    expect(() => parseElasticsearchUrl("ftp://host:9200")).toThrow(
      "无效的 Elasticsearch URL 格式。",
    );
  });
});

describe("getUrlPlaceholder", () => {
  it("按数据库类型返回占位文案", () => {
    expect(getUrlPlaceholder("mysql")).toBe(
      "例如: mysql://user:password@host:port/database_name",
    );
    expect(getUrlPlaceholder("redis")).toBe(
      "例如: redis://password@host:port/db_index",
    );
    expect(getUrlPlaceholder("kafka")).toBe("例如: kafka://host:port");
  });

  it("未知/无 URL 形式的类型走默认文案", () => {
    expect(getUrlPlaceholder("mssql")).toBe("请输入连接字符串");
  });
});
