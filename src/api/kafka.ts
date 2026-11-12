import { BACKEND_COMMANDS, callBackend } from "./client";

export const createKafkaTopic = (
  connectionId: number,
  topic: string,
  numPartitions: number,
  replicationFactor: number,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.kafkaCreateTopic, {
    connectionId,
    topic,
    numPartitions,
    replicationFactor,
  });

export const deleteKafkaTopic = (
  connectionId: number,
  topic: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.kafkaDeleteTopic, {
    connectionId,
    topic,
  });

export interface SendMessageParams {
  connectionId: number;
  topic: string;
  /** Kafka 用 key，RocketMQ 用 tag —— 由面板配置决定 */
  metaField: "key" | "tag";
  meta: string | null;
  value: string;
}

/**
 * Kafka / RocketMQ 共用的消息发送入口：两个后端命令的参数体同形，
 * 只有元数据字段名不同（`key` / `tag`）。
 */
export const sendMessage = ({
  connectionId,
  topic,
  metaField,
  meta,
  value,
}: SendMessageParams): Promise<string> =>
  callBackend<string>(
    metaField === "key"
      ? BACKEND_COMMANDS.kafkaProduceMessage
      : BACKEND_COMMANDS.rocketmqSendMessage,
    { connectionId, topic, [metaField]: meta || null, value },
  );
