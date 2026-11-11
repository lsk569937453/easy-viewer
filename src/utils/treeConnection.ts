import type { ConnectionSummary } from "../types/backend";

/**
 * 按根节点的 `config_value`（即连接的 base_config_id）查找连接。
 * 原 DatabaseViewer 与 TabPanel 各自内联了同一段查找逻辑。
 */
export const findConnectionByRootConfigId = (
  connections: ConnectionSummary[] | null | undefined,
  rootConfigId: string | number | undefined,
): ConnectionSummary | undefined => {
  if (!connections || rootConfigId === undefined) return undefined;
  const target = String(rootConfigId);
  return connections.find(
    (connection) => connection.base_config_id.toString() === target,
  );
};
