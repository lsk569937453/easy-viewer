import { useState } from "react";
import { FaStream } from "react-icons/fa";
import { IoRefresh, IoTrashOutline } from "react-icons/io5";
import { deleteKafkaTopic } from "../services/kafka";
import type { ConnectionSummary } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import TopicConfigTab from "./kafka-topic/TopicConfigTab";
import TopicOverviewTab from "./kafka-topic/TopicOverviewTab";
import TopicPartitionsTab from "./kafka-topic/TopicPartitionsTab";
import { useKafkaTopic } from "./kafka-topic/useKafkaTopic";
import ActionButton from "./ui/ActionButton";
import ConfirmDialog from "./ui/ConfirmDialog";
import PageHeader from "./ui/PageHeader";
import SegmentedTabs, { type SegmentedTabItem } from "./ui/SegmentedTabs";
import StatusChip from "./ui/StatusChip";
import { ErrorState, LoadingState } from "./ui/states";

interface KafkaTopicDetailProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
  /** 删除成功后通知外层关闭标签页并刷新树 */
  onTopicDeleted?: (node: TreeNode) => void;
}

const TOPIC_TABS: readonly SegmentedTabItem[] = [
  { id: "overview", label: "概览" },
  { id: "partitions", label: "分区" },
  { id: "config", label: "配置" },
];

function KafkaTopicDetail({
  activeTabNode,
  connectionDetails,
  onTopicDeleted,
}: KafkaTopicDetailProps) {
  const { topicName, topicInfo, partitions, loading, error, refresh } =
    useKafkaTopic(activeTabNode);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 删除 Topic：确认走 ConfirmDialog，成功后局部刷新并关闭标签页，
  // 不再使用 window.location.reload()（会丢掉全部标签页状态）。
  const handleDeleteTopic = async () => {
    setDeleting(true);
    try {
      const responseJson = await deleteKafkaTopic(
        connectionDetails.base_config_id,
        topicName,
      );
      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        showSuccess(`Topic "${topicName}" 已删除`);
        setConfirmDeleteOpen(false);
        onTopicDeleted?.(activeTabNode);
      } else {
        showError(`删除失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`删除 Topic 时发生错误: ${getErrorMessage(err)}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !topicInfo) {
    return <LoadingState label="正在读取 Topic 信息…" />;
  }

  if (error && !topicInfo) {
    return (
      <ErrorState
        className="m-3"
        title="读取失败"
        description={error}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={topicName}
        subtitle="Kafka Topic"
        meta={
          <>
            <FaStream aria-hidden="true" />
            <StatusChip tone="info">{partitions.length} 个分区</StatusChip>
          </>
        }
        actions={
          <>
            <ActionButton
              size="sm"
              icon={<IoRefresh aria-hidden="true" />}
              loading={loading}
              onClick={() => void refresh()}
            >
              刷新
            </ActionButton>
            <ActionButton
              size="sm"
              variant="danger"
              icon={<IoTrashOutline aria-hidden="true" />}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              删除
            </ActionButton>
          </>
        }
      />

      <SegmentedTabs
        items={TOPIC_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="Topic 详情视图"
      />

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {activeTab === "overview" ? (
          <TopicOverviewTab topicName={topicName} partitions={partitions} />
        ) : null}
        {activeTab === "partitions" ? (
          <TopicPartitionsTab partitions={partitions} />
        ) : null}
        {activeTab === "config" ? (
          <TopicConfigTab partitionCount={partitions.length} />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`删除 Topic「${topicName}」？`}
        description="该操作不可撤销，Topic 及其消息将被永久删除。"
        confirmText="删除"
        busy={deleting}
        onConfirm={() => void handleDeleteTopic()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}

export default KafkaTopicDetail;
