import type { ConnectionSummary } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { findConnectionByRootConfigId } from "../../utils/treeConnection";

/**
 * 单表节点 -> 默认 SELECT 语句。按连接类型生成方言，保留原有兜底文案。
 */
export const generateSqlForNode = (
  node: TreeNode,
  allConnections: ConnectionSummary[],
  limit = 100,
): string => {
  if (node?.iconName !== "singleTable") {
    return "此节点类型不适用于SQL生成。";
  }

  const rootConfigId = node.path[0].config_value;
  const connection = findConnectionByRootConfigId(allConnections, rootConfigId);

  if (!connection) {
    return `/* 错误: 无法找到连接信息来生成SQL */\nSELECT * FROM ${node.name} LIMIT ${limit};`;
  }

  const dbType = connection.connection_type;
  const tableName = node.name;

  switch (dbType) {
    case 0: {
      // MySQL
      const mysqlDatabaseName =
        node.path.length > 2
          ? node.path[1].config_value
          : connection.connection_name;
      return `SELECT * FROM \`${mysqlDatabaseName}\`.\`${tableName}\` LIMIT ${limit};`;
    }
    case 5: {
      // OracleDB
      const oracleSchemaName =
        node.path.length > 2
          ? node.path[1].config_value
          : connection.connection_name;
      return `SELECT * FROM "${oracleSchemaName}"."${tableName}" WHERE ROWNUM <= ${limit};`;
    }
    case 3:
      // SQLite
      return `SELECT * FROM \`${tableName}\` LIMIT ${limit};`;
    case 1: {
      // PostgreSQL
      const pgSchemaName =
        node.path.length > 2 ? node.path[1].config_value : "public";
      return `SELECT * FROM "${pgSchemaName}"."${tableName}" LIMIT ${limit};`;
    }
    case 6: {
      // MSSQL
      const mssqlDatabaseName =
        node.path.length > 2
          ? node.path[1].config_value
          : connection.connection_name;
      const mssqlSchemaName =
        node.path.length > 4 ? node.path[3].config_value : "dbo";
      return `SELECT TOP ${limit} * FROM [${mssqlDatabaseName}].[${mssqlSchemaName}].[${tableName}];`;
    }
    case 7:
      // Clickhouse
      return `SELECT * FROM ${tableName} LIMIT ${limit};`;
    case 4:
      // MongoDB
      return `SELECT * FROM ${tableName} LIMIT ${limit}`;
    case 9:
      // Redis
      return `SELECT * FROM ${tableName} LIMIT ${limit}`;
    case 10:
      // Elasticsearch
      return `SELECT * FROM ${tableName} LIMIT ${limit}`;
    default:
      return `SELECT * FROM ${tableName} LIMIT ${limit};`;
  }
};
