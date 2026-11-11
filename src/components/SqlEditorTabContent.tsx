import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { FaPlay, FaSave } from "react-icons/fa";
import type { ConnectionSummary, ExeSqlResponse } from "../types/backend";
import type { SetActiveTabId, SetTabs, SqlEditorTab } from "../types/tab";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import ActionButton from "./ui/ActionButton";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import Pagination from "./ui/Pagination";
import SearchBox from "./ui/SearchBox";
import StatusChip from "./ui/StatusChip";
import { EmptyState, ErrorState } from "./ui/states";
import Toolbar from "./ui/Toolbar";

type TableRowData = Record<string, string | null>;

interface SqlEditorTabContentProps {
  tab: SqlEditorTab;
  connections: ConnectionSummary[];
  setTabs: SetTabs;
  setActiveTabId: SetActiveTabId;
  onQuerySaved?: (queryId: string, newName: string) => void;
}

function SqlEditorTabContent({
  tab,
  setTabs,
  setActiveTabId,
  onQuerySaved,
}: SqlEditorTabContentProps) {
  const [sqlContent, setSqlContent] = useState("");
  const [queryName, setQueryName] = useState(tab.name);
  const [executionTime, setExecutionTime] = useState(0);
  const [allFetchedData, setAllFetchedData] = useState<TableRowData[]>([]);
  const [columns, setColumns] = useState<{ name: string }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const connectionId = tab.connectionId;
  const queryId = tab.queryId;
  const databaseName = tab.databaseName;

  const tableColumns = useMemo<ColumnDef<TableRowData>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: (info) => String(info.getValue()),
    }));
  }, [columns]);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return allFetchedData;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allFetchedData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm),
      ),
    );
  }, [allFetchedData, searchTerm]);

  const displayData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const table = useReactTable({
    data: displayData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const updateTabDirtyState = (dirty: boolean) => {
    setIsDirty(dirty);
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tab.id ? { ...t, isDirty: dirty } : t)),
    );
  };

  useEffect(() => {
    const fetchQueryContent = async () => {
      if (!queryId) {
        setSqlContent(tab.initialSql || "");
        setQueryName(tab.name);
        updateTabDirtyState(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const responseJson = await invoke<string>("get_query", {
          connectionId: connectionId,
          queryName: tab.name,
          databaseName: databaseName || undefined,
        });
        const { response_code, response_msg } =
          parseBaseResponse<string>(responseJson);

        if (response_code === 0) {
          setSqlContent(response_msg || "");
          setQueryName(tab.name);
          updateTabDirtyState(false);
        } else {
          throw new Error(response_msg || "未能获取查询内容或响应格式不正确");
        }
      } catch (err) {
        console.error("Failed to load query content:", err);
        setError(`加载查询内容失败: ${getErrorMessage(err)}`);
        setSqlContent("");
        updateTabDirtyState(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueryContent();
  }, [queryId, tab.id, tab.name, connectionId, databaseName, setTabs]);

  const handleSqlContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSqlContent(e.target.value);
    if (!isDirty) {
      updateTabDirtyState(true);
    }
  };

  const handleQueryNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQueryName(e.target.value);
    if (!isDirty) {
      updateTabDirtyState(true);
    }
  };

  const handleExecuteSql = useCallback(async () => {
    if (!sqlContent.trim()) {
      setError("SQL 查询不能为空。");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAllFetchedData([]);
    setColumns([]);
    setExecutionTime(0);
    setTotalRows(0);
    setCurrentPage(1);
    setSearchTerm(""); // 执行查询时清空搜索词

    try {
      const listNodeInfoReqObject = {
        level_infos: [
          {
            level: 0,
            config_value: connectionId.toString(),
          },
        ],
      };

      const responseJson = await invoke<string>("exe_sql", {
        sql: sqlContent,
        listNodeInfoReq: listNodeInfoReqObject,
      });
      const { response_code, response_msg } =
        parseBaseResponse<ExeSqlResponse>(responseJson);

      if (response_code === 0) {
        const rawHeaders = response_msg.header;
        const rawRows = response_msg.rows;

        const fetchedColumns = rawHeaders.map((col) => ({
          name: col.name,
        }));

        const fetchedColumnHeadersNames = fetchedColumns.map((col) => col.name);

        const fetchedData: TableRowData[] = rawRows.map((rowArray) => {
          const rowObject: TableRowData = {};
          rowArray.forEach((value, index) => {
            const headerName = fetchedColumnHeadersNames[index];
            if (headerName) {
              rowObject[headerName] = value;
            }
          });
          return rowObject;
        });

        setColumns(fetchedColumns);
        setAllFetchedData(fetchedData);
        // exe_sql 响应不包含 execution_time_ms（见 src-tauri/src/vojo/exe_sql_response.rs），保持为 0
        setExecutionTime(0);
        setCurrentPage(1);
      } else {
        throw new Error(response_msg || "未能获取查询结果或响应格式不正确");
      }
    } catch (err) {
      console.error("SQL execution failed:", err);
      setError(`执行 SQL 失败: ${getErrorMessage(err)}`);
      setColumns([]);
      setAllFetchedData([]);
      setTotalRows(0);
      setExecutionTime(0);
      setCurrentPage(1);
    } finally {
      setIsLoading(false);
    }
  }, [sqlContent, connectionId]);

  const handleSaveQuery = useCallback(async () => {
    if (!sqlContent.trim()) {
      setError("SQL 查询不能为空，无法保存。");
      return;
    }

    const savePromise = invoke<string>("save_query", {
      connectionId: connectionId,
      queryName: queryName,
      sql: sqlContent,
      databaseName: databaseName || undefined,
    });

    toast.promise(savePromise, {
      loading: "正在保存...",
      success: (responseJson) => {
        const { response_code, response_msg } =
          parseBaseResponse<string>(responseJson);
        if (response_code !== 0) {
          throw new Error(response_msg || "保存失败，但未收到错误详情。");
        }

        const prevQueryId = queryId; // 保存操作前的 queryId
        const savedQueryId = response_msg; // 后端返回的 query id
        const nameChanged = tab.name !== queryName; // 检查当前输入框中的名称是否与tab的当前名称不同

        updateTabDirtyState(false);

        const newTabId = `sql-editor-${savedQueryId}`;

        // 更新 Tab 面板自身的名称和ID
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === tab.id && t.type === "sqlEditor"
              ? {
                  ...t,
                  queryId: savedQueryId,
                  id: newTabId,
                  name: queryName,
                }
              : t,
          ),
        );

        // 同步更新 activeTabId，防止 tab body 消失
        if (setActiveTabId) {
          setActiveTabId(newTabId);
        }

        // 如果名称发生变化且存在有效的 queryId，则通知 DatabaseViewer 更新树节点
        if (savedQueryId && nameChanged) {
          if (onQuerySaved) {
            onQuerySaved(savedQueryId, queryName);
          }
        } else if (!prevQueryId && savedQueryId) {
          // 新查询首次保存
        }

        return "查询已成功保存!";
      },
      error: (err: unknown) =>
        `保存失败: ${getErrorMessage(err) || "未知错误"}`,
    });
  }, [
    sqlContent,
    queryName,
    connectionId,
    queryId,
    databaseName,
    tab.id,
    tab.name,
    setTabs,
    onQuerySaved,
    setActiveTabId,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSaveQuery();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setTotalRows(filteredData.length);
  }, [filteredData]);

  const totalPages = Math.ceil(totalRows / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

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
          value={queryName}
          onChange={handleQueryNameChange}
          title="查询名称"
        />
        {isDirty ? <StatusChip tone="warning">未保存</StatusChip> : null}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
          <ActionButton
            variant="primary"
            size="sm"
            icon={<FaPlay size="0.8em" aria-hidden="true" />}
            loading={isLoading}
            onClick={() => void handleExecuteSql()}
            title="执行 SQL (F5)"
          >
            执行
          </ActionButton>
          <ActionButton
            size="sm"
            icon={<FaSave size="0.85em" aria-hidden="true" />}
            onClick={() => void handleSaveQuery()}
            disabled={isLoading}
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
          value={sqlContent}
          onChange={handleSqlContentChange}
        />
      </div>

      {error ? (
        <ErrorState
          className="mx-3 mt-2"
          title="执行失败"
          description={error}
        />
      ) : null}

      {/* 数据操作区 */}
      <Toolbar
        className="mt-2"
        left={
          <SearchBox
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="搜索数据…"
            ariaLabel="搜索数据"
            className="max-w-xs"
          />
        }
        right={
          <>
            {executionTime > 0 ? (
              <span className="text-micro text-base-content/45">
                耗时 {executionTime} ms
              </span>
            ) : null}
            <span className="text-micro text-base-content/45">
              总计 {totalRows} 行
            </span>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        }
      />

      {/* 结果表格 */}
      <DataTableShell
        className="m-3"
        loading={isLoading && allFetchedData.length === 0}
        isEmpty={filteredData.length === 0}
        placeholder={
          <EmptyState
            compact
            title={searchTerm ? "没有匹配的数据" : "还没有查询结果"}
            description={
              searchTerm
                ? `没有找到与「${searchTerm}」匹配的数据。`
                : "在上方输入 SQL 并执行，结果会显示在这里。"
            }
          />
        }
      >
        <table className={TABLE_CLASS}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="max-w-[320px] truncate"
                    title={String(cell.getValue() || "")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
export default SqlEditorTabContent;
