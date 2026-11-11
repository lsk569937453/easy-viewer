import type { ConnectionSummary } from "../types/backend";
import type { TreeNode } from "../types/tree";
import MessageListPanel from "./messages/MessageListPanel";
import { ROCKETMQ_MESSAGE_CONFIG } from "./messages/messageConfigs";

interface RocketmqMessagesPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

/** RocketMQ 消息面板：与 Kafka 共用 MessageListPanel，差异在 messageConfigs。 */
function RocketmqMessagesPanel({
  activeTabNode,
  connectionDetails,
}: RocketmqMessagesPanelProps) {
  return (
    <MessageListPanel
      activeTabNode={activeTabNode}
      connectionDetails={connectionDetails}
      config={ROCKETMQ_MESSAGE_CONFIG}
    />
  );
}

export default RocketmqMessagesPanel;
