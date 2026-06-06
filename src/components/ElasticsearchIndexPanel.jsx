import React, { useState, useEffect, useCallback } from "react";
import { showError } from "../utils/showToast.jsx";
import { invoke } from "@tauri-apps/api/core";
import {
  IoRefresh,
  IoSearch,
  IoArrowBack,
  IoArrowForward,
  IoPlaySkipBack,
} from "react-icons/io5";

const DEFAULT_QUERY = `{
  "match_all": {}
}`;

function ElasticsearchIndexPanel({ activeTabNode, connectionDetails }) {
  const [documents, setDocuments] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search mode: "simple" | "query"
  const [searchMode, setSearchMode] = useState("simple");

  // Simple search
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");

  // Custom query
  const [queryText, setQueryText] = useState(DEFAULT_QUERY);
  const [pendingQuery, setPendingQuery] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Expanded rows for JSON detail
  const [expandedRows, setExpandedRows] = useState(new Set());

  const indexName = activeTabNode?.name || "unknown";

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseJson = await invoke("elasticsearch_search", {
        listNodeInfoReq: { level_infos: activeTabNode.path },
        indexName: indexName,
        query: searchMode === "simple" ? pendingSearch || null : null,
        searchQuery: searchMode === "query" ? pendingQuery : null,
        from: currentPage * pageSize,
        size: pageSize,
      });

      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0 && response_msg) {
        setHeaders(response_msg.header || []);
        setDocuments(response_msg.rows || []);
        setTotalCount(response_msg.total_count || 0);
      } else {
        setError(response_msg || "Failed to fetch documents");
      }
    } catch (err) {
      setError(`Error fetching documents: ${err.message || err.toString()}`);
      console.error("Failed to fetch ES documents:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTabNode, indexName, searchMode, pendingSearch, pendingQuery, currentPage, pageSize]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSimpleSearch = () => {
    setPendingSearch(searchTerm);
    setCurrentPage(0);
    setExpandedRows(new Set());
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPendingSearch("");
    setCurrentPage(0);
    setExpandedRows(new Set());
  };

  const handleRunQuery = () => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      showError("Query 不能为空");
      return;
    }
    try {
      JSON.parse(trimmed);
    } catch (e) {
      showError(`Query JSON 格式错误: ${e.message}`);
      return;
    }
    setPendingQuery(trimmed);
    setCurrentPage(0);
    setExpandedRows(new Set());
  };

  const handleClearQuery = () => {
    setQueryText(DEFAULT_QUERY);
    setPendingQuery(null);
    setCurrentPage(0);
    setExpandedRows(new Set());
  };

  const handleResetAll = () => {
    setSearchTerm("");
    setPendingSearch("");
    setQueryText(DEFAULT_QUERY);
    setPendingQuery(null);
    setCurrentPage(0);
    setExpandedRows(new Set());
  };

  const switchMode = (mode) => {
    setSearchMode(mode);
    setCurrentPage(0);
    setExpandedRows(new Set());
    // Reset pending state when switching
    if (mode === "simple") {
      setPendingQuery(null);
    } else {
      setPendingSearch("");
    }
  };

  const toggleRowExpand = (rowIndex) => {
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

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasActiveFilter = pendingSearch || pendingQuery;

  const formatCellValue = (value, headerName) => {
    if (value === null || value === undefined) return "-";

    // Try to detect and pretty-print JSON strings
    if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
      try {
        const parsed = JSON.parse(value);
        return (
          <pre
            className="text-xs bg-base-200 p-1.5 rounded overflow-x-auto max-w-md whitespace-pre-wrap break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        // Not valid JSON, show as-is
      }
    }

    // Truncate long values
    if (typeof value === "string" && value.length > 120) {
      return (
        <span className="font-mono text-xs break-all" title={value}>
          {value.substring(0, 120)}...
        </span>
      );
    }

    return <span className="font-mono text-xs">{value}</span>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-base-content/10 px-4 py-3 bg-base-200/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              {indexName}
            </h3>
            <button
              className={`btn btn-sm btn-outline ${loading ? "loading" : ""}`}
              onClick={fetchDocuments}
              disabled={loading}
            >
              <IoRefresh className="mr-1" />
              刷新
            </button>

            {/* Mode toggle */}
            <div className="join">
              <button
                className={`btn btn-sm join-item ${searchMode === "simple" ? "btn-active" : ""}`}
                onClick={() => switchMode("simple")}
              >
                简单搜索
              </button>
              <button
                className={`btn btn-sm join-item ${searchMode === "query" ? "btn-active" : ""}`}
                onClick={() => switchMode("query")}
              >
                自定义 Query
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {searchMode === "simple" ? (
              /* Simple text search */
              <div className="join">
                <input
                  type="text"
                  placeholder="搜索文档..."
                  className="input input-bordered input-sm join-item w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSimpleSearch();
                  }}
                />
                {pendingSearch && (
                  <button
                    className="btn btn-sm join-item btn-ghost"
                    onClick={handleClearSearch}
                    title="清除搜索"
                  >
                    ✕
                  </button>
                )}
                <button
                  className="btn btn-sm join-item btn-primary"
                  onClick={handleSimpleSearch}
                >
                  <IoSearch />
                </button>
              </div>
            ) : (
              /* Custom query - run/clear buttons only; editor is below */
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleRunQuery}
                  disabled={loading}
                >
                  <IoSearch className="mr-1" />
                  执行 Query
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={handleClearQuery}
                >
                  重置
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom query editor (only in query mode) */}
      {searchMode === "query" && (
        <div className="flex-shrink-0 border-b border-base-content/10">
          <div className="px-4 py-2">
            <div className="text-xs text-base-content/50 mb-1">
              Elasticsearch query DSL（仅需填写 query 部分）
            </div>
            <textarea
              className="textarea textarea-bordered w-full font-mono text-xs leading-relaxed"
              rows={6}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleRunQuery();
                }
              }}
              spellCheck={false}
              placeholder='{"match_all": {}}'
            />
            <div className="text-xs text-base-content/40 mt-1">
              Ctrl + Enter 执行 | 支持任何 Elasticsearch query DSL，如 term、match、bool、range 等
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex-shrink-0 px-4 py-2 bg-base-300/30 text-xs text-base-content/70 flex items-center gap-2">
        <span>
          显示 {documents.length} 条文档 (共 {totalCount} 条)
        </span>
        {hasActiveFilter && (
          <span className="badge badge-sm badge-primary">
            {searchMode === "simple"
              ? `搜索: "${pendingSearch}"`
              : "自定义 Query"}
          </span>
        )}
        {hasActiveFilter && (
          <button
            className="btn btn-xs btn-ghost"
            onClick={handleResetAll}
          >
            清除条件
          </button>
        )}
      </div>

      {/* Document table */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="alert alert-error m-4">
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/40">
            <p className="text-lg">暂无文档</p>
            <p className="text-sm mt-2">
              {hasActiveFilter ? "尝试调整搜索条件" : "此索引中没有文档"}
            </p>
          </div>
        ) : (
          <table className="table table-zebra table-pin-rows">
            <thead className="bg-base-200">
              <tr>
                <th className="w-10 text-sm"></th>
                {headers.map((header, index) => (
                  <th key={index} className="text-sm">
                    {header.name}
                    {header.is_primary_key && (
                      <span className="ml-1 text-warning">★</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <tr
                    className="hover cursor-pointer"
                    onClick={() => toggleRowExpand(rowIndex)}
                  >
                    <td className="text-center text-xs text-base-content/40">
                      {expandedRows.has(rowIndex) ? "▼" : "▶"}
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="text-sm max-w-md overflow-hidden"
                      >
                        {formatCellValue(
                          cell,
                          headers[cellIndex]?.name
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* Expanded JSON detail */}
                  {expandedRows.has(rowIndex) && (
                    <tr className="bg-base-200/50">
                      <td colSpan={headers.length + 1} className="p-0">
                        <div className="p-3">
                          <div className="text-xs font-semibold text-base-content/60 mb-2">
                            文档详情
                          </div>
                          <pre className="text-xs bg-base-300 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
                            {(() => {
                              const doc = {};
                              headers.forEach((h, i) => {
                                const val = row[i];
                                if (val !== null && val !== undefined) {
                                  try {
                                    doc[h.name] = JSON.parse(val);
                                  } catch {
                                    doc[h.name] = val;
                                  }
                                }
                              });
                              return JSON.stringify(doc, null, 2);
                            })()}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0 border-t border-base-content/10 px-4 py-3 bg-base-200/30">
        <div className="flex items-center justify-between">
          <div className="text-sm text-base-content/70">
            第 {currentPage + 1} / {totalPages || 1} 页，每页
            <select
              className="select select-bordered select-xs ml-2 mr-1"
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
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
              className="btn btn-sm join-item"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
            >
              <IoPlaySkipBack />
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <IoArrowBack />
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage + 1 >= totalPages}
            >
              <IoArrowForward />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ElasticsearchIndexPanel;
