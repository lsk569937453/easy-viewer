import { useEffect, useState } from "react";
import { listNodeInfo } from "../../services/tree";
import type { ListNodeInfoResponse } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";

export interface TopicInfo {
  name: string;
  partitionCount: number;
}

export interface TopicPartition {
  id: number;
  leader: string;
}

export interface KafkaTopicState {
  topicName: string;
  topicInfo: TopicInfo | null;
  partitions: TopicPartition[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Topic 名取 path 倒数第二段（与原实现一致），缺失时退回节点名。 */
export const resolveTopicName = (node: TreeNode): string =>
  node.path?.[node.path.length - 2]?.config_value || node.name;

/** 从 list_node_info 的子项里提取分区（icon_name = kafka_single_partition）。 */
export const mapPartitionNodes = (
  items: ListNodeInfoResponse["list"],
): TopicPartition[] =>
  items
    .filter((item) => item.icon_name === "kafka_single_partition")
    .map((item) => {
      const match = item.name.match(/Partition (\d+)/);
      return {
        id: match ? Number.parseInt(match[1], 10) : -1,
        leader: item.description || "未知",
      };
    });

export function useKafkaTopic(activeTabNode: TreeNode): KafkaTopicState {
  const [topicInfo, setTopicInfo] = useState<TopicInfo | null>(null);
  const [partitions, setPartitions] = useState<TopicPartition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topicName = resolveTopicName(activeTabNode);

  const fetchTopicInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const responseJson = await listNodeInfo({
        level_infos: activeTabNode.path,
      });
      const { response_code, response_msg } =
        parseBaseResponse<ListNodeInfoResponse>(responseJson);

      if (response_code === 0) {
        const partitionNodes = mapPartitionNodes(response_msg.list);
        setPartitions(partitionNodes);
        setTopicInfo({
          name: topicName,
          partitionCount: partitionNodes.length,
        });
      }
    } catch (err) {
      setError(`获取 Topic 信息失败: ${getErrorMessage(err)}`);
      console.error("Failed to fetch topic info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTopicInfo();
  }, [topicName]);

  return {
    topicName,
    topicInfo,
    partitions,
    loading,
    error,
    refresh: fetchTopicInfo,
  };
}
