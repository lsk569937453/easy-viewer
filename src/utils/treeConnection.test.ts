import { describe, expect, it } from "vitest";
import type { ConnectionSummary } from "../types/backend";
import { findConnectionByRootConfigId } from "./treeConnection";

const connections: ConnectionSummary[] = [
  {
    base_config_id: 7,
    connection_name: "本地 MySQL",
    connection_type: 0,
    description: "",
    host: "127.0.0.1",
    port: 3306,
  },
  {
    base_config_id: 9,
    connection_name: "远程 PG",
    connection_type: 1,
    description: "",
    host: null,
    port: null,
  },
];

describe("findConnectionByRootConfigId", () => {
  it("按字符串或数字 id 命中", () => {
    expect(
      findConnectionByRootConfigId(connections, "7")?.connection_name,
    ).toBe("本地 MySQL");
    expect(findConnectionByRootConfigId(connections, 9)?.connection_name).toBe(
      "远程 PG",
    );
  });

  it("未命中或入参缺失返回 undefined", () => {
    expect(findConnectionByRootConfigId(connections, "404")).toBeUndefined();
    expect(
      findConnectionByRootConfigId(connections, undefined),
    ).toBeUndefined();
    expect(findConnectionByRootConfigId(null, "7")).toBeUndefined();
  });
});
