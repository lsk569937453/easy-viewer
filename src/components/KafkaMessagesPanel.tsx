import { invoke } from "@tauri-apps/api/core";
import { type ReactNode, useEffect, useState } from "react";
import { FiSend } from "react-icons/fi";
import {
  IoArrowBack,
  IoArrowForward,
  IoPlaySkipBack,
  IoRefresh,
  IoSearch,
} from "react-icons/io5";
import type {
  ConnectionSummary,
  ExeSqlResponse,
  SqlHeader,
} from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";

interface KafkaMessagesPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

function KafkaMessagesPanel({
  activeTabNode,
  connectionDetails,
}: KafkaMessagesPanelProps) {
  const [messages, setMessages] = useState<(string | null)[][]>([]);
  const [headers, setHeaders] = useState<SqlHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partitionFilter, setPartitionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // 分页状态
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalMessages, setTotalMessages] = useState(0);

  // 生产消息状态
  const [showProducerModal, setShowProducerModal] = useState(false);
  const [newMessageKey, setNewMessageKey] = useState("");
  const [newMessageValue, setNewMessageValue] = useState("");
  const [sending, setSending] = useState(false);

  const topicName =
    activeTabNode?.path?.[activeTabNode.path.length - 1]?.config_value ||
    activeTabNode?.name;

  // 获取消息
  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const listNodeInfoReq = {
        level_infos: activeTabNode.path,
      };

      const responseJson = await invoke<string>("exe_sql", {
        listNodeInfoReq,
        sql: `SELECT * FROM ${topicName} LIMIT ${pageSize} OFFSET ${currentPage * pageSize}`,
      });

      const { response_code, response_msg } =
        parseBaseResponse<ExeSqlResponse>(responseJson);

      if (response_code === 0) {
        setHeaders(response_msg.header || []);
        setMessages(response_msg.rows || []);
        setTotalMessages(response_msg.rows.length);
      } else {
        setError(response_msg || "获取消息失败");
      }
    } catch (err) {
      setError(`获取消息时发生错误: ${getErrorMessage(err)}`);
      console.error("Failed to fetch Kafka messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessageValue.trim()) {
      showError("消息内容不能为空");
      return;
    }

    setSending(true);
    try {
      const responseJson = await invoke<string>("kafka_produce_message", {
        connectionId: connectionDetails.base_config_id,
        topic: topicName,
        key: newMessageKey || null,
        value: newMessageValue,
      });

      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        showSuccess("消息发送成功!");
        setNewMessageKey("");
        setNewMessageValue("");
        setShowProducerModal(false);
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

  useEffect(() => {
    fetchMessages();
  }, [currentPage, pageSize]);

  // 过滤消息
  const filteredMessages = messages.filter((row) => {
    if (partitionFilter !== "all") {
      const partition = row[0]; // 假设第一列是分区
      if (partition !== partitionFilter) return false;
    }

    if (searchTerm) {
      const searchableText = row
        .map((cell) => (cell || "").toString())
        .join(" ")
        .toLowerCase();
      if (!searchableText.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const formatDate = (timestampStr: string): string => {
    if (!timestampStr) return "-";
    try {
      const date = new Date(timestampStr);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestampStr;
    }
  };

  const formatCellValue = (value: string | null, index: number): ReactNode => {
    if (value === null || value === undefined) return "-";
    const headerName = headers[index]?.name;

    if (headerName === "Value") {
      // 尝试格式化 JSON
      try {
        const parsed: unknown = JSON.parse(value);
        return (
          <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto max-w-md">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return (
          <span className="font-mono text-xs break-all max-w-md block">
            {value}
          </span>
        );
      }
    }

    if (headerName === "Timestamp") {
      return formatDate(value);
    }

    return value;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 border-b border-base-content/10 px-4 py-3 bg-base-200/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="text-2xl">📨</span>
              {topicName}
            </h3>
            <button
              className={`btn btn-sm btn-outline ${loading ? "loading" : ""}`}
              onClick={fetchMessages}
              disabled={loading}
            >
              <IoRefresh className="mr-1" />
              刷新
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowProducerModal(true)}
            >
              <FiSend className="mr-1" />
              发送消息
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 分区过滤 */}
            <select
              aria-label="分区筛选"
              className="select select-bordered select-sm"
              value={partitionFilter}
              onChange={(e) => setPartitionFilter(e.target.value)}
            >
              <option value="all">所有分区</option>
              <option value="0">分区 0</option>
              <option value="1">分区 1</option>
              <option value="2">分区 2</option>
            </select>

            {/* 搜索 */}
            <div className="join">
              <input
                aria-label="搜索消息"
                type="text"
                placeholder="搜索消息..."
                className="input input-bordered input-sm join-item"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button aria-label="搜索" className="btn btn-sm join-item">
                <IoSearch aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 消息统计 */}
      <div className="flex-shrink-0 px-4 py-2 bg-base-300/30 text-xs text-base-content/70">
        显示 {filteredMessages.length} / {totalMessages} 条消息
        {partitionFilter !== "all" && ` (分区 ${partitionFilter})`}
      </div>

      {/* 消息表格 */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="alert alert-error m-4">
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/40">
            <p className="text-lg">暂无消息</p>
            <p className="text-sm mt-2">
              {searchTerm || partitionFilter !== "all"
                ? "尝试调整过滤条件"
                : "点击上方发送消息按钮开始"}
            </p>
          </div>
        ) : (
          <table className="table table-zebra table-pin-rows">
            <thead className="bg-base-200">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="text-sm">
                    {header.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="text-sm max-w-md overflow-hidden"
                    >
                      {formatCellValue(cell, cellIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页控制 */}
      <div className="flex-shrink-0 border-t border-base-content/10 px-4 py-3 bg-base-200/30">
        <div className="flex items-center justify-between">
          <div className="text-sm text-base-content/70">
            第 {currentPage + 1} 页，每页
            <select
              aria-label="每页条数"
              className="select select-bordered select-xs ml-2"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number.parseInt(e.target.value, 10));
                setCurrentPage(0);
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            条
          </div>

          <div className="join">
            <button
              aria-label="第一页"
              className="btn btn-sm join-item"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
            >
              <IoPlaySkipBack aria-hidden="true" />
            </button>
            <button
              aria-label="上一页"
              className="btn btn-sm join-item"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <IoArrowBack aria-hidden="true" />
            </button>
            <button
              aria-label="下一页"
              className="btn btn-sm join-item"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={filteredMessages.length < pageSize}
            >
              <IoArrowForward aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* 发送消息模态框 */}
      {showProducerModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">发送消息到 {topicName}</h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label" htmlFor="kafka-message-key">
                  <span className="label-text">Key (可选)</span>
                </label>
                <input
                  id="kafka-message-key"
                  name="kafka-message-key"
                  type="text"
                  className="input input-bordered"
                  value={newMessageKey}
                  onChange={(e) => setNewMessageKey(e.target.value)}
                  placeholder="例如: user-id-123"
                />
              </div>

              <div className="form-control">
                <label className="label" htmlFor="kafka-message-value">
                  <span className="label-text">Value (消息内容)</span>
                  <span className="label-text-alt text-error">*</span>
                </label>
                <textarea
                  id="kafka-message-value"
                  name="kafka-message-value"
                  className="textarea textarea-bordered h-32 font-mono text-sm"
                  value={newMessageValue}
                  onChange={(e) => setNewMessageValue(e.target.value)}
                  placeholder='{"event": "user_login", "userId": "123"}'
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text-alt">
                    提示: JSON 格式的消息将被自动格式化
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowProducerModal(false);
                  setNewMessageKey("");
                  setNewMessageValue("");
                }}
                disabled={sending}
              >
                取消
              </button>
              <button
                className={`btn btn-primary ${sending ? "loading" : ""}`}
                onClick={handleSendMessage}
                disabled={sending || !newMessageValue.trim()}
              >
                <FiSend className="mr-1" />
                发送
              </button>
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => {
              setShowProducerModal(false);
              setNewMessageKey("");
              setNewMessageValue("");
            }}
          ></form>
        </dialog>
      )}
    </div>
  );
}

export default KafkaMessagesPanel;
