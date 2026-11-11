import type { ConnectionSummary } from "../../types/backend";
import { CONNECTION_TYPE_TO_DB_TYPE } from "../../types/backend";
import type { RootNodeDescriptor } from "../../types/tree";
import { getNodeIcon } from "../tree/nodeIcons";

/**
 * connections -> 根节点描述（不含 children 等运行时状态）。
 * 从 DatabaseViewer 内联的 `toRootDescriptor` 抽出，保留原有的 13 种
 * connection_type 映射与 `default` 兜底。
 */
export const buildRootDescriptor = (
  conn: ConnectionSummary,
): RootNodeDescriptor => {
  const dbType = CONNECTION_TYPE_TO_DB_TYPE[conn.connection_type] || "default";

  return {
    id: conn.base_config_id,
    name: conn.connection_name,
    type: dbType,
    icon: getNodeIcon(dbType, null),
    iconName: dbType,
    description: conn.description,
    host: conn.host ?? null,
    port: conn.port ?? null,
    details: `ID: ${
      conn.base_config_id
    }\n类型: ${dbType.toUpperCase()}\n主机: ${conn.host || "N/A"}:${
      conn.port || "N/A"
    }`,
    path: [{ level: 1, config_value: conn.base_config_id.toString() }],
  };
};
