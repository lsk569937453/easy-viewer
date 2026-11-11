import { invoke } from "@tauri-apps/api/core";
import { type ReactNode, useEffect, useState } from "react";
import { FiSend } from "react-icons/fi";
import { IoRefresh } from "react-icons/io5";
import type {
  ConnectionSummary,
  ExeSqlResponse,
  SqlHeader,
} from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";
import { showError, showSuccess } from "../../utils/showToast";
import ActionButton from "../ui/ActionButton";
import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import FormField from "../ui/FormField";
import PageHeader from "../ui/PageHeader";
import Pagination from "../ui/Pagination";
import SearchBox from "../ui/SearchBox";
import StatusChip from "../ui/StatusChip";
import { EmptyState, ErrorState } from "../ui/states";
import Toolbar from "../ui/Toolbar";
import {
  formatMessageTimestamp,
  type MessagePanelConfig,
} from "./messageConfigs";

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
  const [messages, setMessages] = useState<(string | null)[][]>([]);
  const [headers, setHeaders] = useState<SqlHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partitionFilter, setPartitionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalMessages, setTotalMessages] = useState(0);

  const [showProducerModal, setShowProducerModal] = useState(false);
  const [newMeta, setNewMeta] = useState("");
  const [newMessageValue, setNewMessageValue] = useState("");
  const [sending, setSending] = useState(false);

  const topicName =
    activeTabNode?.path?.[activeTabNode.path.length - 1]?.config_value ||
    activeTabNode?.name;

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const responseJson = await invoke<string>("exe_sql", {
        listNodeInfoReq: { level_infos: activeTabNode.path },
        sql: `SELECT * FROM ${topicName} LIMIT ${pageSize} OFFSET ${currentPage * pageSize}`,
      });

      const { response_code, response_msg } =
        parseBaseResponse<ExeSqlResponse>(responseJson);

      if (response_code === 0) {
        const rows = response_msg.rows ?? [];
        setHeaders(response_msg.header ?? []);
        setMessages(rows);
        setTotalMessages(rows.length);
      } else {
        setError(response_msg || "获取消息失败");
      }
    } catch (err) {
      setError(`获取消息时发生错误: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMessages();
  }, [currentPage, pageSize]);

  const handleSendMessage = async () => {
    if (!newMessageValue.trim()) {
      showError("消息内容不能为空");
      return;
    }

    setSending(true);
    try {
      const responseJson = await invoke<string>(config.sendCommand, {
        connectionId: connectionDetails.base_config_id,
        topic: topicName,
        [config.metaField]: newMeta || null,
        value: newMessageValue,
      });

      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        showSuccess("消息发送成功!");
        handleCloseProducer();
        await fetchMessages();
      } else {
        showError(`发送消息失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`发送消息时发生错误: ${getErrorMessage(err)}`);
    } finally {
      setSending(false);
    }
  };

  const handleCloseProducer = () => {
    setShowProducerModal(false);
    setNewMeta("");
    setNewMessageValue("");
  };

  const filteredMessages = messages.filter((row) => {
    if (config.supportsPartitionFilter && partitionFilter !== "all") {
      if (row[0] !== partitionFilter) return false;
    }
    if (searchTerm) {
      const searchableText = row
        .map((cell) => (cell || "").toString())
        .join(" ")
        .toLowerCase();
      if (!searchableText.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const formatCellValue = (value: string | null, index: number): ReactNode => {
    if (value === null || value === undefined) return "-";
    const headerName = headers[index]?.name;

    if (headerName === config.bodyHeader) {
      try {
        const parsed: unknown = JSON.parse(value);
        return (
          <pre className="max-w-md overflow-x-auto rounded bg-base-200 p-1.5 text-[11px] leading-relaxed">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return (
          <span className="block max-w-md break-all font-mono text-[11px]">
            {value}
          </span>
        );
      }
    }

    if (headerName === config.timeHeader) {
      return formatMessageTimestamp(value);
    }

    return value;
  };

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

      <DataTableShell
        loading={loading}
        isEmpty={!error && filteredMessages.length === 0}
        placeholder={
          error ? (
            <ErrorState
              className="m-3"
              title="消息读取失败"
              description={error}
              onRetry={() => void fetchMessages()}
            />
          ) : (
            <EmptyState
              title="暂无消息"
              description={
                searchTerm ||
                (config.supportsPartitionFilter && partitionFilter !== "all")
                  ? "尝试调整过滤条件。"
                  : config.emptyHint
              }
            />
          )
        }
      >
        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header.name}>{header.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMessages.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="max-w-md overflow-hidden">
                    {formatCellValue(cell, cellIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>

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
          onPageChange={(page) => setCurrentPage(Math.max(0, page - 1))}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(0);
          }}
        />
      </div>

      {showProducerModal ? (
        <dialog className="modal modal-open">
          <div className="app-panel modal-box max-w-lg p-0">
            <div className="border-b border-hairline px-4 py-3">
              <h3 className="text-[13px] font-semibold">
                发送消息到 {topicName}
              </h3>
            </div>
            <div className="space-y-3 px-4 py-3">
              <FormField
                label={`${config.metaLabel}（可选）`}
                htmlFor="message-meta"
              >
                <input
                  id="message-meta"
                  name="message-meta"
                  type="text"
                  className="input h-8 w-full text-xs"
                  value={newMeta}
                  onChange={(event) => setNewMeta(event.target.value)}
                  placeholder={config.metaPlaceholder}
                />
              </FormField>
              <FormField
                label="消息内容"
                htmlFor="message-value"
                required
                help="JSON 会以格式化形式展示；纯文本原样显示。"
              >
                <textarea
                  id="message-value"
                  name="message-value"
                  className="textarea h-32 w-full font-mono text-xs"
                  value={newMessageValue}
                  onChange={(event) => setNewMessageValue(event.target.value)}
                  placeholder='{"event": "user_login", "userId": "123"}'
                  required
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 border-t border-hairline px-4 py-2.5">
              <ActionButton onClick={handleCloseProducer} disabled={sending}>
                取消
              </ActionButton>
              <ActionButton
                variant="primary"
                icon={<FiSend aria-hidden="true" />}
                loading={sending}
                disabled={!newMessageValue.trim()}
                onClick={() => void handleSendMessage()}
              >
                发送
              </ActionButton>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              aria-label="关闭"
              onClick={handleCloseProducer}
            >
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}

export default MessageListPanel;
