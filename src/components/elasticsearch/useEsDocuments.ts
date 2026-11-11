import { useCallback, useEffect, useState } from "react";
import { searchIndex } from "../../services/elasticsearch";
import type { ExeSqlResponse, SqlHeader } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";
import { totalPagesOf, toZeroBasedPage } from "./esDocumentModel";

export type EsSearchMode = "simple" | "query";

export interface UseEsDocumentsOptions {
  activeTabNode: TreeNode;
  indexName: string;
  searchMode: EsSearchMode;
  pendingSearch: string;
  pendingQuery: string | null;
}

export interface EsDocumentsState {
  documents: (string | null)[][];
  headers: SqlHeader[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  expandedRows: Set<number>;
  fetchDocuments: () => Promise<void>;
  toggleRowExpand: (rowIndex: number) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  /** 回到第一页并收起所有展开行（搜索条件变更时复用）。 */
  resetPaging: () => void;
}

/**
 * ES 文档列表状态：请求 / 分页 / 行展开。
 * 保持拆分前 `fetchDocuments` 的依赖语义：搜索条件或分页变化都会重新拉取。
 */
export function useEsDocuments({
  activeTabNode,
  indexName,
  searchMode,
  pendingSearch,
  pendingQuery,
}: UseEsDocumentsOptions): EsDocumentsState {
  const [documents, setDocuments] = useState<(string | null)[][]>([]);
  const [headers, setHeaders] = useState<SqlHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseJson = await searchIndex({
        listNodeInfoReq: { level_infos: activeTabNode.path },
        indexName,
        query: searchMode === "simple" ? pendingSearch || null : null,
        searchQuery: searchMode === "query" ? pendingQuery : null,
        from: currentPage * pageSize,
        size: pageSize,
      });

      const { response_code, response_msg } =
        parseBaseResponse<ExeSqlResponse>(responseJson);

      if (response_code === 0) {
        setHeaders(response_msg.header);
        setDocuments(response_msg.rows);
        setTotalCount(response_msg.total_count ?? 0);
      } else {
        setError(response_msg || "Failed to fetch documents");
      }
    } catch (err) {
      setError(`Error fetching documents: ${getErrorMessage(err)}`);
      console.error("Failed to fetch ES documents:", err);
    } finally {
      setLoading(false);
    }
  }, [
    activeTabNode,
    indexName,
    searchMode,
    pendingSearch,
    pendingQuery,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const toggleRowExpand = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(toZeroBasedPage(page));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const resetPaging = () => {
    setCurrentPage(0);
    setExpandedRows(new Set());
  };

  return {
    documents,
    headers,
    loading,
    error,
    currentPage,
    pageSize,
    totalCount,
    totalPages: totalPagesOf(totalCount, pageSize),
    expandedRows,
    fetchDocuments,
    toggleRowExpand,
    handlePageChange,
    handlePageSizeChange,
    resetPaging,
  };
}
