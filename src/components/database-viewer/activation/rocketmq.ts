import { activateTabById, type NodeActivationArgs } from "./context";

/** RocketMQ topic 消息 tab。 */
export const activateRocketmqNode = async (
  args: NodeActivationArgs,
): Promise<void> => {
  const { node, connection } = args;
  const nodeType = node.iconName;

  // Topic 消息查看
  if (
    nodeType === "rocketmq_messages" ||
    nodeType === "rocketmq_single_topic"
  ) {
    const topicName =
      node.path[node.path.length - 1]?.config_value || node.name;
    const tabId = `rocketmq-messages-${node.id}`;

    activateTabById(args, tabId, () => ({
      id: tabId,
      name: `${topicName} - Messages`,
      icon: node.icon,
      type: "rocketmqMessages",
      node: node,
      connectionDetails: connection,
    }));
    if (nodeType === "rocketmq_messages") {
      await args.handleToggleNode(node);
    }
    return;
  }

  // 默认展开/折叠
  await args.handleToggleNode(node);
};
