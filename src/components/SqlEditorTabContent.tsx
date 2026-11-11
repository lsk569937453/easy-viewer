import { useEffect } from "react";
import { FaPlay, FaSave } from "react-icons/fa";
import type { ConnectionSummary } from "../types/backend";
import type { SetActiveTabId, SetTabs, SqlEditorTab } from "../types/tab";
import SqlResultTable from "./sql-editor/SqlResultTable";
import { useQueryDocument } from "./sql-editor/useQueryDocument";
import { useSqlExecution } from "./sql-editor/useSqlExecution";
import ActionButton from "./ui/ActionButton";
import StatusChip from "./ui/StatusChip";
import { ErrorState } from "./ui/states";

interface SqlEditorTabContentProps {
  tab: SqlEditorTab;
  connections: ConnectionSummary[];
  setTabs: SetTabs;
  setActiveTabId: SetActiveTabId;
  onQuerySaved?: (queryId: string, newName: string) => void;
}

/**
 * SQL 编辑器标签页：查询名称/内容编辑、执行、保存。
 * 文档状态与执行状态分别拆到 `sql-editor/` 下的 hook。
 */
function SqlEditorTabContent({
  tab,
  setTabs,
  setActiveTabId,
  onQuerySaved,
}: SqlEditorTabContentProps) {
  const execution = useSqlExecution({ connectionId: tab.connectionId });
  const doc = useQueryDocument({
    tab,
    setTabs,
    setActiveTabId,
    onQuerySaved,
    setError: execution.setError,
    setIsLoading: execution.setIsLoading,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void doc.handleSaveQuery();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [doc.handleSaveQuery]);

  return (
    // 3. 移除之前添加的 relative 定位和 Notification 组件渲染
    <div className="flex h-full min-h-0 flex-col">
      {/* 页头：查询名称 + 执行/保存 */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-hairline px-3 py-2">
        <input
          type="text"
          className="input h-8 min-w-0 max-w-xs flex-1 border-transparent bg-transparent px-1 text-[13px] font-semibold"
          aria-label="查询名称"
          name="queryName"
          value={doc.queryName}
          onChange={doc.handleQueryNameChange}
          title="查询名称"
        />
        {doc.isDirty ? <StatusChip tone="warning">未保存</StatusChip> : null}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
          <ActionButton
            variant="primary"
            size="sm"
            icon={<FaPlay size="0.8em" aria-hidden="true" />}
            loading={execution.isLoading}
            onClick={() => void execution.executeSql(doc.sqlContent)}
            title="执行 SQL (F5)"
          >
            执行
          </ActionButton>
          <ActionButton
            size="sm"
            icon={<FaSave size="0.85em" aria-hidden="true" />}
            onClick={() => void doc.handleSaveQuery()}
            disabled={execution.isLoading}
            title="保存查询 (Ctrl+S)"
          >
            保存
          </ActionButton>
        </div>
      </div>

      <div className="flex-shrink-0 px-3 pt-2">
        <textarea
          className="textarea h-40 w-full resize-y rounded-[var(--radius-control)] border-hairline bg-base-100 font-mono text-xs leading-relaxed"
          rows={10}
          placeholder="在此输入 SQL 查询…"
          aria-label="SQL 查询内容"
          name="sqlContent"
          value={doc.sqlContent}
          onChange={doc.handleSqlContentChange}
        />
      </div>

      {execution.error ? (
        <ErrorState
          className="mx-3 mt-2"
          title="执行失败"
          description={execution.error}
        />
      ) : null}

      <SqlResultTable
        columns={execution.columns}
        rows={execution.displayData}
        isEmpty={execution.filteredData.length === 0}
        loading={execution.isLoading && execution.allFetchedData.length === 0}
        searchTerm={execution.searchTerm}
        onSearchTermChange={execution.setSearchTerm}
        executionTime={execution.executionTime}
        totalRows={execution.totalRows}
        currentPage={execution.currentPage}
        totalPages={execution.totalPages}
        onPageChange={execution.handlePageChange}
      />
    </div>
  );
}
export default SqlEditorTabContent;
