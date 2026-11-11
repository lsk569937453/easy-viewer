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
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
  FaSave,
  FaSearch,
} from "react-icons/fa";
import type { ConnectionSummary, ExeSqlResponse } from "../types/backend";
import type { SetActiveTabId, SetTabs, SqlEditorTab } from "../types/tab";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";

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
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full bg-base-100 p-4">
      {/* ... 页面其余部分保持不变 ... */}

      {/* Action Bar */}
      <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
        <input
          type="text"
          className="input input-bordered input-sm font-semibold text-lg flex-grow max-w-xs"
          value={queryName}
          onChange={handleQueryNameChange}
          title="查询名称"
        />
        <button
          className="btn btn-primary btn-sm flex items-center gap-2"
          onClick={handleExecuteSql}
          disabled={isLoading}
          title="执行 SQL (F5)"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <FaPlay />
          )}
          执行
        </button>
        <button
          className="btn btn-ghost btn-sm flex items-center gap-2"
          onClick={handleSaveQuery}
          disabled={isLoading}
          title="保存查询 (Ctrl+S)"
        >
          <FaSave />
          保存
          {isDirty && (
            <span className="text-red-500 text-xl leading-none ml-1">•</span>
          )}{" "}
        </button>
      </div>

      <div className="mb-4 flex-shrink-0">
        <textarea
          className="textarea textarea-bordered w-full font-mono text-sm resize-y"
          rows={10}
          placeholder="在此输入 SQL 查询..."
          value={sqlContent}
          onChange={handleSqlContentChange}
        ></textarea>
      </div>

      {error && (
        <div role="alert" className="alert alert-error mb-4 flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Data Operations Area */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          {/* 搜索输入框，现在带有FaSearch图标，但没有独立的搜索按钮 */}
          <label className="input input-bordered input-sm flex items-center gap-2 w-48">
            <FaSearch />
            <input
              type="text"
              className="grow"
              placeholder="搜索数据..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // 实时更新搜索词
            />
          </label>
        </div>
        <div className="flex items-center space-x-4">
          {executionTime > 0 && (
            <span className="text-sm">耗时: {executionTime} ms</span>
          )}
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <FaChevronLeft />
            </button>
            <span className="join-item btn btn-sm btn-disabled">
              页 {currentPage} / {totalPages || 1}
            </span>
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={
                currentPage === totalPages || isLoading || totalPages === 0
              }
            >
              <FaChevronRight />
            </button>
          </div>
          <span className="text-sm">总计: {totalRows} 行</span>
        </div>
      </div>
      {/* Data Table Area */}
      <div
        className="flex-1 overflow-auto rounded-lg border border-base-content/20"
        ref={tableContainerRef}
      >
        {isLoading && allFetchedData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredData.length > 0 ? (
          <table className="table table-sm w-full" style={{ fontSize: "12px" }}>
            {/* Table Head */}
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="bg-base-200"
                      style={{ width: "150px", fontSize: "12px" }}
                    >
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
            {/* Table Body */}
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} style={{ fontSize: "12px" }}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="truncate"
                      style={{ width: "150px" }}
                      title={String(cell.getValue() || "")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-base-content/60">
            {searchTerm
              ? `没有找到与"${searchTerm}"匹配的数据。`
              : "没有数据可显示。请执行 SQL 查询。"}
          </div>
        )}
      </div>
    </div>
  );
}
export default SqlEditorTabContent;
