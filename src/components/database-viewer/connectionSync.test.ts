import { describe, expect, it } from "vitest";
import type { ConnectionSummary } from "../../types/backend";
import { buildRootDescriptor } from "./connectionSync";

const makeConnection = (
  overrides: Partial<ConnectionSummary>,
): ConnectionSummary => ({
  base_config_id: 7,
  connection_name: "本地 MySQL",
  connection_type: 0,
  description: "开发库",
  host: "127.0.0.1",
  port: 3306,
  ...overrides,
});

describe("buildRootDescriptor", () => {
  it("映射 connection_type、details 与根节点 path", () => {
    const descriptor = buildRootDescriptor(makeConnection({}));

    expect(descriptor.id).toBe(7);
    expect(descriptor.type).toBe("mysql");
    expect(descriptor.iconName).toBe("mysql");
    expect(descriptor.details).toBe("ID: 7\n类型: MYSQL\n主机: 127.0.0.1:3306");
    expect(descriptor.path).toEqual([{ level: 1, config_value: "7" }]);
  });

  it("未知类型回退 default，host/port 缺失时用 N/A", () => {
    const descriptor = buildRootDescriptor(
      makeConnection({
        connection_type: 99,
        host: null,
        port: null,
      }),
    );

    expect(descriptor.type).toBe("default");
    expect(descriptor.iconName).toBe("default");
    expect(descriptor.details).toBe("ID: 7\n类型: DEFAULT\n主机: N/A:N/A");
  });

  it("识别 WebDAV / Redis 等特殊连接类型", () => {
    expect(
      buildRootDescriptor(makeConnection({ connection_type: 12 })).type,
    ).toBe("webdav");
    expect(
      buildRootDescriptor(makeConnection({ connection_type: 9 })).type,
    ).toBe("redis");
  });
});
