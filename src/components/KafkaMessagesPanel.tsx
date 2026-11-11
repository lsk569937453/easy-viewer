import type { ConnectionSummary } from "../types/backend";
import type { TreeNode } from "../types/tree";
import MessageListPanel from "./messages/MessageListPanel";
import { KAFKA_MESSAGE_CONFIG } from "./messages/messageConfigs";

interface KafkaMessagesPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

/** Kafka 消息面板：与 RocketMQ 共用 MessageListPanel，差异在 messageConfigs。 */
function KafkaMessagesPanel({
  activeTabNode,
  connectionDetails,
}: KafkaMessagesPanelProps) {
  return (
    <MessageListPanel
      activeTabNode={activeTabNode}
      connectionDetails={connectionDetails}
      config={KAFKA_MESSAGE_CONFIG}
    />
  );
}

export default KafkaMessagesPanel;
