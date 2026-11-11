import { activateTabById, type NodeActivationArgs } from "./context";

/** Redis key 节点（singleTable + connection_type=9）：打开 key 详情 tab。 */
const activateRedisKey = async ({
  node,
  connection,
  ...context
}: NodeActivationArgs): Promise<void> => {
  const keyName = node.name;
  const tabId = `redis-key-${node.id}`;

  activateTabById(context, tabId, () => ({
    id: tabId,
    name: keyName,
    icon: node.icon,
    type: "redisKeyDetail",
    node: node,
    connectionDetails: connection,
  }));
  await context.handleToggleNode(node);
};

/** Redis 专属节点：key 详情 / console。 */
export const activateRedisNode = async (
  args: NodeActivationArgs,
): Promise<void> => {
  if (args.node.iconName === "singleTable") {
    await activateRedisKey(args);
    return;
  }

  if (args.node.iconName === "redis_console") {
    const tabId = `redis-console-${args.connection.base_config_id}`;
    activateTabById(args, tabId, () => ({
      id: tabId,
      name: `Redis Console`,
      icon: args.node.icon,
      type: "redisConsole",
      node: args.node,
      connectionDetails: args.connection,
    }));
    return;
  }

  // 默认展开/折叠
  await args.handleToggleNode(args.node);
};
