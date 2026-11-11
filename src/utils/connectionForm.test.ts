import { describe, expect, it } from "vitest";
import {
  buildBaseConfigEnum,
  type ConnectionDraft,
  createInitialDraft,
  getHostConnectionDetails,
  getRocketmqConnectionDetails,
  getS3ConnectionDetails,
  getWebdavConnectionDetails,
  isFormValid,
} from "./connectionForm";

const draft = (overrides: Partial<ConnectionDraft> = {}): ConnectionDraft => ({
  ...createInitialDraft(),
  connectionName: "test-conn",
  ...overrides,
});

describe("isFormValid", () => {
  it("连接名称为空时一律无效", () => {
    expect(isFormValid(draft({ connectionName: "  " }))).toBe(false);
  });

  it("URL 模式：连接串非空即有效", () => {
    const urlDraft = draft({
      dbType: "mysql",
      connectionMode: "url",
      connectionString: "mysql://root:secret@db.local:3306/app",
    });
    expect(isFormValid(urlDraft)).toBe(true);
    expect(isFormValid({ ...urlDraft, connectionString: "   " })).toBe(false);
  });

  it("Host 模式：校验主机/端口/用户名", () => {
    const hostDraft = draft({
      dbType: "mysql",
      connectionMode: "host",
      host: "db.local",
      port: "3306",
      username: "root",
    });
    expect(isFormValid(hostDraft)).toBe(true);
    expect(isFormValid({ ...hostDraft, host: "" })).toBe(false);
    expect(isFormValid({ ...hostDraft, port: "70000" })).toBe(false);
    expect(isFormValid({ ...hostDraft, username: "" })).toBe(false);
  });

  it("Redis / Elasticsearch 的 Host 模式不要求用户名", () => {
    for (const dbType of ["redis", "elasticsearch"] as const) {
      expect(
        isFormValid(
          draft({
            dbType,
            connectionMode: "host",
            host: "db.local",
            port: "6379",
            username: "",
          }),
        ),
      ).toBe(true);
    }
  });

  it("Kafka 只需要 broker 主机", () => {
    expect(isFormValid(draft({ dbType: "kafka", host: "broker.local" }))).toBe(
      true,
    );
    expect(isFormValid(draft({ dbType: "kafka", host: "" }))).toBe(false);
  });

  it("S3 / WebDAV / RocketMQ 走各自的必填项", () => {
    expect(
      isFormValid(
        draft({
          dbType: "s3",
          host: "s3.amazonaws.com",
          username: "ak",
          password: "sk",
        }),
      ),
    ).toBe(true);
    expect(
      isFormValid(
        draft({
          dbType: "s3",
          host: "s3.amazonaws.com",
          username: "ak",
          password: "",
        }),
      ),
    ).toBe(false);

    expect(
      isFormValid(draft({ dbType: "webdav", host: "dav.local", port: "443" })),
    ).toBe(true);
    expect(
      isFormValid(
        draft({ dbType: "webdav", host: "dav.local", port: "70000" }),
      ),
    ).toBe(false);

    expect(
      isFormValid(draft({ dbType: "rocketmq", host: "proxy.local" })),
    ).toBe(true);
    expect(isFormValid(draft({ dbType: "rocketmq", host: "" }))).toBe(false);
  });
});

describe("连接详情构建器", () => {
  it("Host 详情：trim 字段、Redis 默认库索引 0", () => {
    expect(
      getHostConnectionDetails(
        draft({
          dbType: "redis",
          host: " db.local ",
          port: " 6379 ",
          username: "",
          password: " pass ",
          databaseName: "",
        }),
      ),
    ).toEqual({
      isValid: true,
      details: {
        host: "db.local",
        port: 6379,
        user_name: "",
        password: "pass",
        database: "0",
      },
    });
  });

  it("Host 详情：端口非法时给出校验文案", () => {
    expect(
      getHostConnectionDetails(
        draft({
          dbType: "mysql",
          host: "db.local",
          port: "0",
          username: "root",
        }),
      ),
    ).toEqual({ isValid: false, message: "端口必须是有效的数字 (1-65535)！" });
  });

  it("S3 详情：端口与 region 有默认值", () => {
    expect(
      getS3ConnectionDetails(
        draft({
          dbType: "s3",
          host: "oss-cn-hangzhou.aliyuncs.com",
          port: "",
          username: "ak",
          password: "sk",
          databaseName: "",
        }),
      ),
    ).toEqual({
      isValid: true,
      details: {
        host: "oss-cn-hangzhou.aliyuncs.com",
        port: 443,
        access_key: "ak",
        secret_key: "sk",
        region: "us-east-1",
      },
    });
    expect(
      getS3ConnectionDetails(
        draft({ dbType: "s3", host: "s3.local", username: "", password: "" }),
      ),
    ).toEqual({ isValid: false, message: "Access Key 不能为空！" });
  });

  it("WebDAV 详情：root_path 补齐前导斜杠与默认值", () => {
    expect(
      getWebdavConnectionDetails(
        draft({
          dbType: "webdav",
          host: "dav.jianguoyun.com",
          port: "",
          username: "user@example.com",
          password: "app-pass",
          databaseName: "dav/",
          useTls: false,
        }),
      ),
    ).toEqual({
      isValid: true,
      details: {
        host: "dav.jianguoyun.com",
        port: 443,
        username: "user@example.com",
        password: "app-pass",
        root_path: "/dav/",
        use_tls: false,
      },
    });
    expect(
      getWebdavConnectionDetails(
        draft({ dbType: "webdav", host: "dav.local", databaseName: "" }),
      ),
    ).toEqual({
      isValid: true,
      details: {
        host: "dav.local",
        port: 443,
        username: "",
        password: "",
        root_path: "/",
        use_tls: true,
      },
    });
  });

  it("RocketMQ 详情：默认端口、Topic 拆分、可选 AK/SK", () => {
    expect(
      getRocketmqConnectionDetails(
        draft({
          dbType: "rocketmq",
          host: "proxy.local",
          port: "",
          username: "",
          password: "",
          rmqTopics: "topic1, topic2\ntopic3 ,",
        }),
      ),
    ).toEqual({
      isValid: true,
      details: {
        proxy_url: "proxy.local:8081",
        access_key: undefined,
        secret_key: undefined,
        topics: ["topic1", "topic2", "topic3"],
      },
    });
  });
});

describe("buildBaseConfigEnum", () => {
  it("SQLite 保存：file_path 取 trim 后的连接串", () => {
    expect(
      buildBaseConfigEnum(
        draft({ dbType: "sqlite", connectionString: " /tmp/demo.db " }),
        "save",
      ),
    ).toEqual({ sqlite: { file_path: "/tmp/demo.db" } });
  });

  it("测试模式：SQLite 未选文件、URL 为空时抛出对应文案", () => {
    expect(() =>
      buildBaseConfigEnum(
        draft({ dbType: "sqlite", connectionString: "" }),
        "test",
      ),
    ).toThrow("请选择一个数据库文件！");
    expect(() =>
      buildBaseConfigEnum(
        draft({
          dbType: "mysql",
          connectionMode: "url",
          connectionString: " ",
        }),
        "test",
      ),
    ).toThrow("连接字符串不能为空，无法测试！");
  });

  it("Host 模式使用 UI→后端类型映射（oracle → oracledb）", () => {
    expect(
      buildBaseConfigEnum(
        draft({
          dbType: "oracle",
          connectionMode: "host",
          host: "db.local",
          port: "1521",
          username: "system",
          password: "oracle",
          databaseName: "ORCL",
        }),
        "save",
      ),
    ).toEqual({
      oracledb: {
        config: {
          host: "db.local",
          port: 1521,
          user_name: "system",
          password: "oracle",
          database: "ORCL",
        },
      },
    });
  });

  it("URL 模式：保存走 trim，未知类型抛出不支持文案", () => {
    expect(
      buildBaseConfigEnum(
        draft({
          dbType: "mysql",
          connectionMode: "url",
          connectionString: " mysql://root:secret@db.local:3306/app ",
        }),
        "save",
      ),
    ).toEqual({
      mysql: {
        config: {
          host: "db.local",
          port: 3306,
          database: "app",
          user_name: "root",
          password: "secret",
        },
      },
    });
    expect(() =>
      buildBaseConfigEnum(
        draft({ dbType: "mssql", connectionMode: "url", connectionString: "" }),
        "save",
      ),
    ).toThrow("不支持的数据库类型: mssql");
  });
});
