import { useCallback, useEffect, useState } from "react";
import { FaList, FaSearch } from "react-icons/fa";
import { IoRefresh } from "react-icons/io5";
import { fetchIndexDetail } from "../api/elasticsearch";
import type { ConnectionSummary } from "../types/backend";
import type { EsIndexDetail } from "../types/elasticsearch";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError } from "../utils/showToast";
import DocumentTable from "./elasticsearch/DocumentTable";
import IndexDetailSection from "./elasticsearch/IndexDetailSection";
import QueryDslEditor from "./elasticsearch/QueryDslEditor";
import { useEsDocuments } from "./elasticsearch/useEsDocuments";
import ActionButton from "./ui/ActionButton";
import PageHeader from "./ui/PageHeader";
import Pagination from "./ui/Pagination";
import SearchBox from "./ui/SearchBox";
import SegmentedTabs from "./ui/SegmentedTabs";
import StatusChip from "./ui/StatusChip";
import Toolbar from "./ui/Toolbar";

const DEFAULT_QUERY = `{
  "match_all": {}
}`;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const SEARCH_MODES = [
  { id: "simple", label: "简单搜索" },
  { id: "query", label: "自定义 Query" },
] as const;

type SearchMode = (typeof SEARCH_MODES)[number]["id"];

interface ElasticsearchIndexPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

interface SearchFilterBarProps {
  searchMode: SearchMode;
  searchTerm: string;
  onChangeSearchTerm: (value: string) => void;
  onSimpleSearch: () => void;
  onClearSearch: () => void;
  onRunQuery: () => void;
  onClearQuery: () => void;
  onResetAll: () => void;
  hasActiveFilter: boolean;
  pendingSearch: string;
  loading: boolean;
}

/** 工具条左侧：按搜索模式切换「搜索框 / 执行 Query」并展示当前筛选态。 */
function SearchFilterBar({
  searchMode,
  searchTerm,
  onChangeSearchTerm,
  onSimpleSearch,
  onClearSearch,
  onRunQuery,
  onClearQuery,
  onResetAll,
  hasActiveFilter,
  pendingSearch,
  loading,
}: SearchFilterBarProps) {
  return (
    <>
      {searchMode === "simple" ? (
        <SearchBox
          value={searchTerm}
          onChange={onChangeSearchTerm}
          onSubmit={onSimpleSearch}
          onClear={onClearSearch}
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
            onClick={onRunQuery}
          >
            执行 Query
          </ActionButton>
          <ActionButton size="sm" variant="ghost" onClick={onClearQuery}>
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
          <ActionButton size="sm" variant="ghost" onClick={onResetAll}>
            清除条件
          </ActionButton>
        </>
      ) : null}
    </>
  );
}

interface IndexPanelHeaderProps {
  indexName: string;
  totalCount: number;
  loading: boolean;
  showDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

/** 页头：索引名 + 文档数 + 刷新 / 索引详情操作。 */
function IndexPanelHeader({
  indexName,
  totalCount,
  loading,
  showDetail,
  onRefresh,
  onToggleDetail,
}: IndexPanelHeaderProps) {
  return (
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
            onClick={onRefresh}
          >
            刷新
          </ActionButton>
          <ActionButton
            size="sm"
            variant={showDetail ? "primary" : "secondary"}
            icon={<FaList size="0.85em" aria-hidden="true" />}
            onClick={onToggleDetail}
            aria-pressed={showDetail}
          >
            索引详情
          </ActionButton>
        </>
      }
    />
  );
}

function ElasticsearchIndexPanel({
  activeTabNode,
}: ElasticsearchIndexPanelProps) {
  // Search mode: "simple" | "query"
  const [searchMode, setSearchMode] = useState<SearchMode>("simple");
  // Simple search
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  // Custom query
  const [queryText, setQueryText] = useState(DEFAULT_QUERY);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  // Index detail (template, ILM, settings)
  const [indexDetail, setIndexDetail] = useState<EsIndexDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const indexName = activeTabNode?.name || "unknown";

  const {
    documents,
    headers,
    loading,
    error,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    expandedRows,
    fetchDocuments,
    toggleRowExpand,
    handlePageChange,
    handlePageSizeChange,
    resetPaging,
  } = useEsDocuments({
    activeTabNode,
    indexName,
    searchMode,
    pendingSearch,
    pendingQuery,
  });

  // Fetch index detail (template + ILM)
  const loadIndexDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const responseJson = await fetchIndexDetail(
        { level_infos: activeTabNode.path },
        indexName,
      );
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
    loadIndexDetail();
  }, [loadIndexDetail]);

  const handleSimpleSearch = () => {
    setPendingSearch(searchTerm);
    resetPaging();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPendingSearch("");
    resetPaging();
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
    resetPaging();
  };

  const handleClearQuery = () => {
    setQueryText(DEFAULT_QUERY);
    setPendingQuery(null);
    resetPaging();
  };

  const handleResetAll = () => {
    setSearchTerm("");
    setPendingSearch("");
    setQueryText(DEFAULT_QUERY);
    setPendingQuery(null);
    resetPaging();
  };

  const switchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    resetPaging();
    if (mode === "simple") {
      setPendingQuery(null);
    } else {
      setPendingSearch("");
    }
  };

  const hasActiveFilter = Boolean(pendingSearch || pendingQuery);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <IndexPanelHeader
        indexName={indexName}
        totalCount={totalCount}
        loading={loading}
        showDetail={showDetail}
        onRefresh={() => void fetchDocuments()}
        onToggleDetail={() => setShowDetail((prev) => !prev)}
      />
      <SegmentedTabs
        items={SEARCH_MODES}
        activeId={searchMode}
        onChange={switchMode}
      />

      <Toolbar
        left={
          <SearchFilterBar
            searchMode={searchMode}
            searchTerm={searchTerm}
            onChangeSearchTerm={setSearchTerm}
            onSimpleSearch={handleSimpleSearch}
            onClearSearch={handleClearSearch}
            onRunQuery={handleRunQuery}
            onClearQuery={handleClearQuery}
            onResetAll={handleResetAll}
            hasActiveFilter={hasActiveFilter}
            pendingSearch={pendingSearch}
            loading={loading}
          />
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

      <IndexDetailSection
        showDetail={showDetail}
        indexDetail={indexDetail}
        detailLoading={detailLoading}
        detailError={detailError}
        onRetry={() => void loadIndexDetail()}
      />

      {searchMode === "query" ? (
        <QueryDslEditor
          queryText={queryText}
          onChange={setQueryText}
          onRun={handleRunQuery}
        />
      ) : null}

      <DocumentTable
        documents={documents}
        headers={headers}
        expandedRows={expandedRows}
        loading={loading}
        error={error}
        hasActiveFilter={hasActiveFilter}
        onToggleRow={toggleRowExpand}
        onRetry={() => void fetchDocuments()}
      />
    </div>
  );
}

export default ElasticsearchIndexPanel;
