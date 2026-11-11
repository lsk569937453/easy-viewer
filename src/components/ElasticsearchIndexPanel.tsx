import { invoke } from "@tauri-apps/api/core";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaDatabase,
  FaKey,
  FaList,
  FaPaperclip,
  FaRecycle,
  FaSearch,
} from "react-icons/fa";
import { IoRefresh } from "react-icons/io5";
import type {
  ConnectionSummary,
  ExeSqlResponse,
  SqlHeader,
} from "../types/backend";
import type { EsIndexDetail, EsMatchingTemplate } from "../types/elasticsearch";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError } from "../utils/showToast";
import ActionButton from "./ui/ActionButton";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import FormField from "./ui/FormField";
import KeyValueTable from "./ui/KeyValueTable";
import PageHeader from "./ui/PageHeader";
import Pagination from "./ui/Pagination";
import SearchBox from "./ui/SearchBox";
import StatusChip, { type StatusTone } from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";
import Toolbar from "./ui/Toolbar";

const DEFAULT_QUERY = `{
  "match_all": {}
}`;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const SEARCH_MODES = [
  { id: "simple", label: "简单搜索" },
  { id: "query", label: "自定义 Query" },
] as const;

const ILM_PHASES = ["hot", "warm", "cold", "frozen", "delete"] as const;

const ILM_TONE: Record<string, StatusTone> = {
  hot: "error",
  warm: "warning",
  cold: "info",
  frozen: "neutral",
  delete: "neutral",
};

interface ElasticsearchIndexPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

function ElasticsearchIndexPanel({
  activeTabNode,
}: ElasticsearchIndexPanelProps) {
  const [documents, setDocuments] = useState<(string | null)[][]>([]);
  const [headers, setHeaders] = useState<SqlHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search mode: "simple" | "query"
  const [searchMode, setSearchMode] = useState<"simple" | "query">("simple");

  // Simple search
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");

  // Custom query
  const [queryText, setQueryText] = useState(DEFAULT_QUERY);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Expanded rows for JSON detail
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Index detail (template, ILM, settings)
  const [indexDetail, setIndexDetail] = useState<EsIndexDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const indexName = activeTabNode?.name || "unknown";

  // Fetch index detail (template + ILM)
  const fetchIndexDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const responseJson = await invoke<string>("elasticsearch_index_detail", {
        listNodeInfoReq: { level_infos: activeTabNode.path },
        indexName: indexName,
      });
      const { response_code, response_msg } =
        parseBaseResponse<EsIndexDetail>(responseJson);
      if (response_code === 0) {
        setIndexDetail(response_msg);
      } else {
        setDetailError(response_msg || "后端未返回索引详情");
      }
    } catch (err) {
      setDetailError(getErrorMessage(err));
      console.error("Failed to fetch index detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }, [activeTabNode, indexName]);

  useEffect(() => {
    fetchIndexDetail();
  }, [fetchIndexDetail]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseJson = await invoke<string>("elasticsearch_search", {
        listNodeInfoReq: { level_infos: activeTabNode.path },
        indexName: indexName,
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
      showError(`Query JSON 格式错误: ${getErrorMessage(e)}`);
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

  const switchMode = (mode: "simple" | "query") => {
    setSearchMode(mode);
    setCurrentPage(0);
    setExpandedRows(new Set());
    if (mode === "simple") {
      setPendingQuery(null);
    } else {
      setPendingSearch("");
    }
  };

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
    setCurrentPage(Math.max(0, page - 1));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasActiveFilter = Boolean(pendingSearch || pendingQuery);

  const formatCellValue = (
    value: string | null,
    _headerName?: string,
  ): ReactNode => {
    if (value === null || value === undefined) return "-";

    if (
      typeof value === "string" &&
      (value.startsWith("{") || value.startsWith("["))
    ) {
      try {
        const parsed: unknown = JSON.parse(value);
        return (
          <pre
            className="max-w-md whitespace-pre-wrap break-all rounded bg-base-200 p-1.5 font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        // not JSON
      }
    }

    if (typeof value === "string" && value.length > 120) {
      return (
        <span className="break-all font-mono text-xs" title={value}>
          {value.substring(0, 120)}...
        </span>
      );
    }

    return <span className="font-mono text-xs">{value}</span>;
  };

  const buildDocument = (row: (string | null)[]): Record<string, unknown> => {
    const doc: Record<string, unknown> = {};
    headers.forEach((header, cellIndex) => {
      const value = row[cellIndex];
      if (value !== null && value !== undefined) {
        try {
          doc[header.name] = JSON.parse(value);
        } catch {
          doc[header.name] = value;
        }
      }
    });
    return doc;
  };

  const ilmPhasesData = indexDetail?.ilm_policy_detail?.policy?.phases;
  const matchingTemplates: EsMatchingTemplate[] =
    indexDetail?.matching_templates ?? [];
  const createdAt =
    indexDetail?.creation_date && indexDetail.creation_date !== "-"
      ? new Date(Number.parseInt(indexDetail.creation_date, 10)).toLocaleString(
          "zh-CN",
        )
      : "-";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={indexName}
        subtitle="Elasticsearch 索引"
        meta={
          <>
            <FaSearch size="0.8em" aria-hidden="true" />
            <StatusChip tone="info">{totalCount} 条文档</StatusChip>
          </>
        }
        actions={
          <>
            <ActionButton
              size="sm"
              icon={<IoRefresh aria-hidden="true" />}
              loading={loading}
              onClick={() => void fetchDocuments()}
            >
              刷新
            </ActionButton>
            <ActionButton
              size="sm"
              variant={showDetail ? "primary" : "secondary"}
              icon={<FaList size="0.85em" aria-hidden="true" />}
              onClick={() => setShowDetail((prev) => !prev)}
              aria-pressed={showDetail}
            >
              索引详情
            </ActionButton>
          </>
        }
      />

      {/* 搜索模式分段标签 */}
      <div
        role="tablist"
        className="flex h-9 flex-shrink-0 items-stretch border-b border-hairline px-1"
      >
        {SEARCH_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={searchMode === mode.id}
            className={`-mb-px border-b-2 px-3 text-xs transition-colors ${
              searchMode === mode.id
                ? "border-primary font-medium text-base-content"
                : "border-transparent text-base-content/55 hover:text-base-content/85"
            }`}
            onClick={() => switchMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <Toolbar
        left={
          <>
            {searchMode === "simple" ? (
              <SearchBox
                value={searchTerm}
                onChange={setSearchTerm}
                onSubmit={handleSimpleSearch}
                onClear={handleClearSearch}
                placeholder="搜索文档…"
                ariaLabel="搜索文档"
                className="w-64"
              />
            ) : (
              <>
                <ActionButton
                  size="sm"
                  variant="primary"
                  icon={<FaSearch size="0.8em" aria-hidden="true" />}
                  loading={loading}
                  onClick={handleRunQuery}
                >
                  执行 Query
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  onClick={handleClearQuery}
                >
                  重置
                </ActionButton>
              </>
            )}
            {hasActiveFilter ? (
              <>
                <StatusChip
                  tone="info"
                  title={
                    searchMode === "simple"
                      ? `搜索「${pendingSearch}」`
                      : "自定义 Query"
                  }
                >
                  已筛选
                </StatusChip>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  onClick={handleResetAll}
                >
                  清除条件
                </ActionButton>
              </>
            ) : null}
          </>
        }
        right={
          <>
            <span className="whitespace-nowrap text-micro text-base-content/45">
              显示 {documents.length} 条
            </span>
            <Pagination
              page={currentPage + 1}
              totalPages={totalPages}
              total={totalCount}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        }
      />

      {/* 索引详情（可折叠） */}
      {showDetail ? (
        <div className="flex-shrink-0 space-y-2 border-b border-hairline bg-base-200/30 px-3 py-2">
          {detailLoading ? (
            <LoadingState label="正在读取索引详情…" />
          ) : detailError ? (
            <ErrorState
              title="索引详情读取失败"
              description={detailError}
              onRetry={() => void fetchIndexDetail()}
            />
          ) : indexDetail ? (
            <>
              <KeyValueTable
                labelWidth="4.5rem"
                rows={[
                  {
                    label: "分片数",
                    value: (
                      <span className="font-mono">
                        {indexDetail.number_of_shards ?? "-"}
                      </span>
                    ),
                  },
                  {
                    label: "副本数",
                    value: (
                      <span className="font-mono">
                        {indexDetail.number_of_replicas ?? "-"}
                      </span>
                    ),
                  },
                  {
                    label: "UUID",
                    value: (
                      <span className="break-all font-mono">
                        {indexDetail.uuid || "-"}
                      </span>
                    ),
                  },
                  {
                    label: "创建时间",
                    value: <span className="font-mono">{createdAt}</span>,
                  },
                ]}
              />

              <div>
                <div className="mb-1 flex items-center gap-1 text-micro text-base-content/45">
                  <FaPaperclip size="0.8em" aria-hidden="true" />
                  绑定模板（{matchingTemplates.length}）
                </div>
                {matchingTemplates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matchingTemplates.map((template) => (
                      <div
                        key={template.name}
                        className="rounded-[var(--radius-control)] border border-hairline bg-base-100 px-2 py-1"
                      >
                        <div className="text-xs font-medium text-primary">
                          {template.name}
                        </div>
                        <div className="mt-0.5 font-mono text-micro text-base-content/50">
                          patterns: {template.index_patterns}
                          {template.order && template.order !== "0" ? (
                            <span className="ml-2">
                              order: {template.order}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-micro text-base-content/45">
                    无绑定模板
                  </span>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-micro text-base-content/45">
                  <FaRecycle size="0.8em" aria-hidden="true" />
                  生命周期策略（ILM）
                </div>
                {indexDetail.ilm_policy_name ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-primary">
                        {indexDetail.ilm_policy_name}
                      </span>
                      {indexDetail.ilm_rollover_alias ? (
                        <span className="text-micro text-base-content/50">
                          rollover alias:{" "}
                          <code className="text-info">
                            {indexDetail.ilm_rollover_alias}
                          </code>
                        </span>
                      ) : null}
                    </div>

                    {ilmPhasesData ? (
                      <div className="flex items-start gap-1.5 overflow-x-auto pb-1">
                        {ILM_PHASES.map((phase) => {
                          const phaseData = ilmPhasesData[phase];
                          if (!phaseData) return null;

                          return (
                            <div
                              key={phase}
                              className="min-w-[150px] flex-shrink-0 rounded-[var(--radius-control)] border border-hairline bg-base-100 px-2 py-1.5"
                            >
                              <div className="mb-1 flex items-center gap-1">
                                <StatusChip tone={ILM_TONE[phase] ?? "neutral"}>
                                  {phase.toUpperCase()}
                                </StatusChip>
                                {phaseData.min_age ? (
                                  <span className="text-micro text-base-content/45">
                                    {phaseData.min_age}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-micro">
                                {phaseData.actions
                                  ? Object.entries(phaseData.actions).map(
                                      ([action, config]) => (
                                        <div key={action}>
                                          <span className="font-mono font-medium">
                                            {action}
                                          </span>
                                          {typeof config === "object" &&
                                            config !== null &&
                                            Object.keys(config).length > 0 && (
                                              <div className="mt-0.5 text-base-content/45">
                                                {Object.entries(config).map(
                                                  ([key, value]) => (
                                                    <span
                                                      key={key}
                                                      className="mr-1"
                                                    >
                                                      {key}:{" "}
                                                      {typeof value === "object"
                                                        ? JSON.stringify(value)
                                                        : String(value)}
                                                    </span>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      ),
                                    )
                                  : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {indexDetail.ilm_policy_detail ? (
                      <details className="text-micro">
                        <summary className="cursor-pointer text-base-content/45 hover:text-base-content/70">
                          查看完整策略 JSON
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-control)] bg-base-200 p-2 text-micro">
                          {JSON.stringify(
                            indexDetail.ilm_policy_detail,
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-micro text-base-content/45">
                    未配置 ILM 策略
                  </span>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              compact
              title="暂无索引详情"
              description="后端没有返回该索引的模板与 ILM 信息。"
            />
          )}
        </div>
      ) : null}

      {/* 自定义 Query 编辑器 */}
      {searchMode === "query" ? (
        <div className="flex-shrink-0 border-b border-hairline">
          <FormField
            className="px-3 py-2"
            label="Elasticsearch Query DSL（仅需填写 query 部分）"
            htmlFor="es-query-dsl"
            help="Ctrl + Enter 执行；支持 term、match、bool、range 等任意 query DSL。"
          >
            <textarea
              id="es-query-dsl"
              aria-label="Elasticsearch Query DSL"
              className="textarea h-32 w-full resize-y rounded-[var(--radius-control)] border-hairline bg-base-100 font-mono text-xs leading-relaxed"
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
          </FormField>
        </div>
      ) : null}

      {/* 文档表格 / 三态 */}
      {error ? (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <ErrorState
            title="读取文档失败"
            description={error}
            onRetry={() => void fetchDocuments()}
          />
        </div>
      ) : (
        <DataTableShell
          loading={loading}
          isEmpty={documents.length === 0 && !loading}
          placeholder={
            <EmptyState
              title="暂无文档"
              description={
                hasActiveFilter
                  ? "当前搜索条件下没有匹配的文档，试试调整条件。"
                  : "该索引中还没有文档。"
              }
              icon={<FaDatabase size="1.6em" aria-hidden="true" />}
            />
          }
        >
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className="w-8" scope="col" aria-label="展开文档详情" />
                {headers.map((header) => (
                  <th key={header.name} scope="col">
                    {header.name}
                    {header.is_primary_key ? (
                      <span
                        className="ml-1 inline-flex gap-0.5 text-warning"
                        title="主键"
                      >
                        <FaKey size="0.8em" aria-hidden="true" />
                        <span className="sr-only">主键</span>
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((row, rowIndex) => (
                <Fragment key={rowIndex}>
                  <tr
                    className="cursor-pointer"
                    onClick={() => toggleRowExpand(rowIndex)}
                  >
                    <td className="w-8 text-center text-base-content/40">
                      {expandedRows.has(rowIndex) ? (
                        <FaChevronDown size="0.7em" aria-hidden="true" />
                      ) : (
                        <FaChevronRight size="0.7em" aria-hidden="true" />
                      )}
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="max-w-md overflow-hidden">
                        {formatCellValue(cell, headers[cellIndex]?.name)}
                      </td>
                    ))}
                  </tr>
                  {expandedRows.has(rowIndex) ? (
                    <tr>
                      <td colSpan={headers.length + 1} className="p-0">
                        <div className="p-2">
                          <div className="mb-1 text-micro font-medium text-base-content/50">
                            文档详情
                          </div>
                          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-control)] bg-base-200 p-2.5 font-mono text-xs">
                            {JSON.stringify(buildDocument(row), null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      )}
    </div>
  );
}

export default ElasticsearchIndexPanel;
