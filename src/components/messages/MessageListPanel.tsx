import { useState } from "react";
import { FiSend } from "react-icons/fi";
import { IoRefresh } from "react-icons/io5";
import type { ConnectionSummary } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import ActionButton from "../ui/ActionButton";
import PageHeader from "../ui/PageHeader";
import Pagination from "../ui/Pagination";
import SearchBox from "../ui/SearchBox";
import StatusChip from "../ui/StatusChip";
import Toolbar from "../ui/Toolbar";
import MessageTable from "./MessageTable";
import type { MessagePanelConfig } from "./messageConfigs";
import { filterMessages } from "./messageRows";
import ProduceMessageDialog from "./ProduceMessageDialog";
import { useMessageFeed } from "./useMessageFeed";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export interface MessageListPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
  config: MessagePanelConfig;
}

/**
 * Kafka / RocketMQ 共用的消息列表面板。
 * 原 KafkaMessagesPanel(436 行) 与 RocketmqMessagesPanel(417 行) 逐行同构，
 * 差异全部由 config 表达。
 */
function MessageListPanel({
  activeTabNode,
  connectionDetails,
  config,
}: MessageListPanelProps) {
  const {
    topicName,
    messages,
    headers,
    loading,
    error,
    currentPage,
    pageSize,
    totalMessages,
    fetchMessages,
    goToPage,
    changePageSize,
  } = useMessageFeed(activeTabNode);

  const [partitionFilter, setPartitionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showProducerModal, setShowProducerModal] = useState(false);

  const filteredMessages = filterMessages(messages, {
    searchTerm,
    partitionFilter,
    supportsPartitionFilter: config.supportsPartitionFilter,
  });

  const hasMore = filteredMessages.length >= pageSize;
  const totalPages = hasMore ? currentPage + 2 : currentPage + 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={topicName}
        subtitle={`当前页 ${filteredMessages.length} 条 · 共 ${totalMessages} 条`}
        meta={<StatusChip tone="info">{config.label}</StatusChip>}
        actions={
          <>
            <ActionButton
              size="sm"
              icon={<IoRefresh aria-hidden="true" />}
              loading={loading}
              onClick={() => void fetchMessages()}
            >
              刷新
            </ActionButton>
            <ActionButton
              size="sm"
              variant="primary"
              icon={<FiSend aria-hidden="true" />}
              onClick={() => setShowProducerModal(true)}
            >
              发送消息
            </ActionButton>
          </>
        }
      />

      <Toolbar
        left={
          <SearchBox
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="搜索消息…"
            ariaLabel="搜索消息"
            className="max-w-xs"
          />
        }
        right={
          <>
            {config.supportsPartitionFilter ? (
              <select
                aria-label="分区筛选"
                className="select select-xs h-6 min-h-0 rounded-[var(--radius-control)] border-hairline bg-base-200/60"
                value={partitionFilter}
                onChange={(event) => setPartitionFilter(event.target.value)}
              >
                <option value="all">所有分区</option>
                <option value="0">分区 0</option>
                <option value="1">分区 1</option>
                <option value="2">分区 2</option>
              </select>
            ) : null}
            <span className="text-micro text-base-content/45">
              {partitionFilter !== "all" && config.supportsPartitionFilter
                ? `分区 ${partitionFilter} · `
                : ""}
              显示 {filteredMessages.length} / {totalMessages}
            </span>
          </>
        }
      />

      <MessageTable
        headers={headers}
        rows={filteredMessages}
        config={config}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        partitionFilter={partitionFilter}
        onRetry={() => void fetchMessages()}
      />

      <div className="flex flex-shrink-0 items-center justify-between border-t border-hairline px-3 py-1.5">
        <span className="text-micro text-base-content/45">
          第 {currentPage + 1} 页
        </span>
        <Pagination
          page={currentPage + 1}
          totalPages={totalPages}
          total={filteredMessages.length}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </div>

      <ProduceMessageDialog
        open={showProducerModal}
        topicName={topicName}
        connectionId={connectionDetails.base_config_id}
        config={config}
        onClose={() => setShowProducerModal(false)}
        onSent={fetchMessages}
      />
    </div>
  );
}

export default MessageListPanel;
