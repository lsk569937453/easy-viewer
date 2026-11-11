import { describe, expect, it } from "vitest";
import type { ConnectionSummary } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { generateSqlForNode } from "./generateSqlForNode";

const makeConnection = (
  connection_type: number,
  connection_name = "连接",
): ConnectionSummary => ({
  base_config_id: 1,
  connection_name,
  connection_type,
  description: "",
  host: null,
  port: null,
});

const makeNode = (pathValues: string[]): TreeNode => ({
  id: "table",
  name: "orders",
  type: "default",
  iconName: "singleTable",
  path: pathValues.map((value, index) => ({
    level: index + 1,
    config_value: value,
  })),
});

const generate = (
  connectionType: number,
  pathValues = ["1", "shop", "table"],
) =>
  generateSqlForNode(
    makeNode(pathValues),
    [makeConnection(connectionType)],
    50,
  );

describe("generateSqlForNode", () => {
  it("MySQL / Oracle / PostgreSQL / MSSQL 使用带 schema 的方言", () => {
    expect(generate(0)).toBe("SELECT * FROM `shop`.`orders` LIMIT 50;");
    expect(generate(5)).toBe(
      'SELECT * FROM "shop"."orders" WHERE ROWNUM <= 50;',
    );
    expect(generate(1)).toBe('SELECT * FROM "shop"."orders" LIMIT 50;');
    expect(generate(6, ["1", "shop", "table", "sales", "columns"])).toBe(
      "SELECT TOP 50 * FROM [shop].[sales].[orders];",
    );
  });

  it("SQLite / ClickHouse / Mongo / Redis / ES 使用无 schema 语句", () => {
    expect(generate(3)).toBe("SELECT * FROM `orders` LIMIT 50;");
    expect(generate(7)).toBe("SELECT * FROM orders LIMIT 50;");
    expect(generate(4)).toBe("SELECT * FROM orders LIMIT 50");
    expect(generate(9)).toBe("SELECT * FROM orders LIMIT 50");
    expect(generate(10)).toBe("SELECT * FROM orders LIMIT 50");
  });

  it("非单表节点返回固定提示", () => {
    expect(
      generateSqlForNode({ ...makeNode(["1"]), iconName: "query" }, [
        makeConnection(0),
      ]),
    ).toBe("此节点类型不适用于SQL生成。");
  });

  it("找不到连接时返回带错误注释的可执行 SQL", () => {
    expect(
      generateSqlForNode(makeNode(["404", "shop"]), [makeConnection(0)]),
    ).toBe(
      "/* 错误: 无法找到连接信息来生成SQL */\nSELECT * FROM orders LIMIT 100;",
    );
  });
});
