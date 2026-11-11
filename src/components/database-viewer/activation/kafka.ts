import { activateTabById, type NodeActivationArgs } from "./context";

/** Kafka topic 消息 / 详情 tab。 */
export const activateKafkaNode = async (
  args: NodeActivationArgs,
): Promise<void> => {
  const { node, connection } = args;
  const nodeType = node.iconName;

  // Topic 消息查看
  if (nodeType === "kafka_messages" || nodeType === "kafka_single_topic") {
    const topicName =
      node.path[node.path.length - 1]?.config_value || node.name;
    const tabId = `kafka-messages-${node.id}`;

    activateTabById(args, tabId, () => ({
      id: tabId,
      name: `${topicName} - Messages`,
      icon: node.icon,
      type: "kafkaMessages",
      node: node,
      connectionDetails: connection,
    }));
    if (nodeType === "kafka_messages") {
      await args.handleToggleNode(node);
    }
    return;
  }

  // Topic 详情页
  if (nodeType === "kafka_partitions" || nodeType === "kafka_config") {
    const topicName = node.path[node.path.length - 2]?.config_value;
    const tabId = `kafka-topic-${node.id}`;

    activateTabById(args, tabId, () => ({
      id: tabId,
      name: `${topicName} - Details`,
      icon: node.icon,
      type: "kafkaTopicDetail",
      node: node,
      connectionDetails: connection,
    }));
    await args.handleToggleNode(node);
    return;
  }

  // 默认展开/折叠
  await args.handleToggleNode(node);
};
