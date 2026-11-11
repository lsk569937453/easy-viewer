import type { TreeNode } from "../../../types/tree";
import { showError } from "../../../utils/showToast";
import { findConnectionByRootConfigId } from "../../../utils/treeConnection";
import type { NodeActivationContext } from "./context";
import { activateElasticsearchNode } from "./elasticsearch";
import { activateKafkaNode } from "./kafka";
import { activateRedisNode } from "./redis";
import { activateRocketmqNode } from "./rocketmq";
import { activateS3ObjectNode } from "./s3";
import {
  activateColumnNode,
  activateColumnsFolderNode,
  activateIndexNode,
  activateSavedQueryNode,
  activateSingleTableNode,
} from "./sqlNodes";

const isIndexNode = (node: TreeNode) =>
  node.iconName === "singlePrimaryIndex" ||
  node.iconName === "singleCommonIndex";

/**
 * 树行点击入口：保持原 handleNodeActivate 的分支顺序。
 * 各 service family 的 tab/payload 构造放在独立模块，这里只做分发。
 */
export const activateNode = async (
  node: TreeNode,
  context: NodeActivationContext,
): Promise<void> => {
  const rootConfigId = node.path[0]?.config_value;
  const connection = findConnectionByRootConfigId(
    context.connections,
    rootConfigId,
  );

  if (!connection) {
    console.error("Connection details not found for node:", node);
    showError("无法找到数据库连接信息。");
    return;
  }

  const args = { ...context, node, connection };

  if (node.iconName === "singleQuery") {
    await activateSavedQueryNode(args);
    return;
  }
  if (node.iconName === "folder" || node.iconName === "textFile") {
    await activateS3ObjectNode(args);
    return;
  }
  if (node.iconName === "singleTable") {
    if (connection.connection_type === 9) {
      await activateRedisNode(args);
      return;
    }
    if (connection.connection_type === 10) {
      await activateElasticsearchNode(args);
      return;
    }
    await activateSingleTableNode(args);
    return;
  }
  if (isIndexNode(node)) {
    await activateIndexNode(args);
    return;
  }
  if (node.iconName === "column" || node.iconName === "primary") {
    await activateColumnNode(args);
    return;
  }
  if (node.iconName === "columns") {
    await activateColumnsFolderNode(args);
    return;
  }

  // Kafka 节点处理
  if (node.iconName?.startsWith("kafka_")) {
    await activateKafkaNode(args);
    return;
  }

  // RocketMQ 节点处理
  if (node.iconName?.startsWith("rocketmq_")) {
    await activateRocketmqNode(args);
    return;
  }

  // Redis 节点处理
  if (node.iconName?.startsWith("redis_")) {
    await activateRedisNode(args);
    return;
  }

  // 纯文件夹节点（tables, views, columns, index, partitions 等）只展开/折叠，不创建 tab
  await context.handleToggleNode(node);
};
