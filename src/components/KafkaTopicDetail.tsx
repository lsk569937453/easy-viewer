import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FaStream } from "react-icons/fa";
import { IoRefresh, IoTrashOutline } from "react-icons/io5";
import type { ConnectionSummary, ListNodeInfoResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import ActionButton from "./ui/ActionButton";
import ConfirmDialog from "./ui/ConfirmDialog";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import KeyValueTable from "./ui/KeyValueTable";
import PageHeader from "./ui/PageHeader";
import Panel from "./ui/Panel";
import StatusChip from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";

interface KafkaTopicDetailProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
  /** 删除成功后通知外层关闭标签页并刷新树 */
  onTopicDeleted?: (node: TreeNode) => void;
}

interface TopicInfo {
  name: string;
  partitionCount: number;
}

interface TopicPartition {
  id: number;
  leader: string;
}

const TOPIC_TABS = [
  { id: "overview", label: "概览" },
  { id: "partitions", label: "分区" },
  { id: "config", label: "配置" },
] as const;

const STATIC_CONFIG_ROWS = [
  { key: "default.replication.factor", value: "1", note: "默认副本因子" },
  { key: "retention.ms", value: "604800000 (7 days)", note: "消息保留时间" },
  { key: "retention.bytes", value: "-1 (unlimited)", note: "消息保留大小" },
  { key: "cleanup.policy", value: "delete", note: "清理策略" },
];

function KafkaTopicDetail({
  activeTabNode,
  connectionDetails,
  onTopicDeleted,
}: KafkaTopicDetailProps) {
  const [topicInfo, setTopicInfo] = useState<TopicInfo | null>(null);
  const [partitions, setPartitions] = useState<TopicPartition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const topicName =
    activeTabNode?.path?.[activeTabNode.path.length - 2]?.config_value ||
    activeTabNode?.name;

  // 获取 Topic 信息
  const fetchTopicInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const listNodeInfoReq = {
        level_infos: activeTabNode.path,
      };

      const responseJson = await invoke<string>("list_node_info", {
        listNodeInfoReq,
      });

      const { response_code, response_msg } =
        parseBaseResponse<ListNodeInfoResponse>(responseJson);

      if (response_code === 0) {
        // 提取分区信息
        const partitionNodes = response_msg.list.filter(
          (item) => item.icon_name === "kafka_single_partition",
        );

        setPartitions(
          partitionNodes.map((p) => {
            const match = p.name.match(/Partition (\d+)/);
            return {
              id: match ? Number.parseInt(match[1], 10) : -1,
              leader: p.description || "未知",
            };
          }),
        );

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

  // 删除 Topic：确认走 ConfirmDialog，成功后局部刷新并关闭标签页，
  // 不再使用 window.location.reload()（会丢掉全部标签页状态）。
  const handleDeleteTopic = async () => {
    setDeleting(true);
    try {
      const responseJson = await invoke<string>("kafka_delete_topic", {
        connectionId: connectionDetails.base_config_id,
        topic: topicName,
      });

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

  useEffect(() => {
    void fetchTopicInfo();
  }, [topicName]);

  if (loading && !topicInfo) {
    return <LoadingState label="正在读取 Topic 信息…" />;
  }

  if (error && !topicInfo) {
    return (
      <ErrorState
        className="m-3"
        title="读取失败"
        description={error}
        onRetry={() => void fetchTopicInfo()}
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
              onClick={() => void fetchTopicInfo()}
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

      <div
        role="tablist"
        className="flex h-9 flex-shrink-0 items-stretch border-b border-hairline px-1"
      >
        {TOPIC_TABS.map((topicTab) => (
          <button
            key={topicTab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === topicTab.id}
            className={`-mb-px border-b-2 px-3 text-xs transition-colors ${
              activeTab === topicTab.id
                ? "border-primary font-medium text-base-content"
                : "border-transparent text-base-content/55 hover:text-base-content/85"
            }`}
            onClick={() => setActiveTab(topicTab.id)}
          >
            {topicTab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {activeTab === "overview" ? (
          <div className="space-y-3">
            <Panel className="p-3">
              <h3 className="mb-2 text-[13px] font-semibold">基本信息</h3>
              <KeyValueTable
                rows={[
                  {
                    label: "Topic 名称",
                    value: <span className="font-mono">{topicName}</span>,
                  },
                  { label: "分区数", value: partitions.length },
                ]}
              />
            </Panel>

            <Panel className="p-0">
              <h3 className="px-3 pt-3 text-[13px] font-semibold">分区列表</h3>
              <DataTableShell
                className="mt-2"
                isEmpty={partitions.length === 0}
                placeholder={
                  <EmptyState
                    compact
                    title="暂无分区"
                    description="该 Topic 没有返回分区信息。"
                  />
                }
              >
                <table className={TABLE_CLASS}>
                  <thead>
                    <tr>
                      <th>分区 ID</th>
                      <th>Leader</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partitions.map((partition) => (
                      <tr key={partition.id}>
                        <td className="font-mono">Partition {partition.id}</td>
                        <td>{partition.leader}</td>
                        <td>
                          <StatusChip tone="success" dot>
                            在线
                          </StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableShell>
            </Panel>
          </div>
        ) : null}

        {activeTab === "partitions" ? (
          partitions.length === 0 ? (
            <EmptyState
              title="暂无分区信息"
              description="该 Topic 没有返回任何分区。"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {partitions.map((partition) => (
                <Panel key={partition.id} className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold">
                      Partition {partition.id}
                    </span>
                    <StatusChip tone="success" dot>
                      在线
                    </StatusChip>
                  </div>
                  <KeyValueTable
                    labelWidth="4.5rem"
                    rows={[
                      {
                        label: "Leader",
                        value: (
                          <span className="font-mono">{partition.leader}</span>
                        ),
                      },
                      { label: "副本", value: "1" },
                      { label: "ISR", value: "1" },
                    ]}
                  />
                </Panel>
              ))}
            </div>
          )
        ) : null}

        {activeTab === "config" ? (
          <Panel className="p-0">
            <h3 className="px-3 pt-3 text-[13px] font-semibold">Topic 配置</h3>
            <table className={`${TABLE_CLASS} mt-2`}>
              <thead>
                <tr>
                  <th>配置项</th>
                  <th>值</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono">num.partitions</td>
                  <td>{partitions.length}</td>
                  <td>分区数量</td>
                </tr>
                {STATIC_CONFIG_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td className="font-mono">{row.key}</td>
                    <td>{row.value}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
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
