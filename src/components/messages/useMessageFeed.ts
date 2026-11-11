import { useEffect, useState } from "react";
import { exeSql } from "../../services/sql";
import type { ExeSqlResponse, SqlHeader } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";

export interface MessageFeed {
  topicName: string;
  messages: (string | null)[][];
  headers: SqlHeader[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  totalMessages: number;
  fetchMessages: () => Promise<void>;
  goToPage: (page: number) => void;
  changePageSize: (size: number) => void;
}

/**
 * 消息列表的数据侧：结果集、表头、分页与错误态。
 * 从 MessageListPanel 拆出，LIMIT/OFFSET、total=当前页行数、错误文案保持不变。
 */
export function useMessageFeed(activeTabNode: TreeNode): MessageFeed {
  const [messages, setMessages] = useState<(string | null)[][]>([]);
  const [headers, setHeaders] = useState<SqlHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalMessages, setTotalMessages] = useState(0);

  const topicName =
    activeTabNode?.path?.[activeTabNode.path.length - 1]?.config_value ||
    activeTabNode?.name;

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const responseJson = await exeSql(
        `SELECT * FROM ${topicName} LIMIT ${pageSize} OFFSET ${currentPage * pageSize}`,
        { level_infos: activeTabNode.path },
      );

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

  const goToPage = (page: number) => setCurrentPage(Math.max(0, page - 1));

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  return {
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
  };
}
