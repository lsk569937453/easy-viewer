import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FaPlay,
  FaSearch, // Still needed for the input icon
  FaChevronLeft,
  FaChevronRight,
  FaSave,
} from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

function SqlEditorTabContent({ tab, connections, setTabs }) {
  const [sqlContent, setSqlContent] = useState("");
  const [queryName, setQueryName] = useState(tab.name);
  const [executionTime, setExecutionTime] = useState(0);
  const [allFetchedData, setAllFetchedData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState(""); // 搜索关键字
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const connectionId = tab.connectionId;
  const queryId = tab.queryId;
  const tableContainerRef = useRef(null);

  const tableColumns = useMemo(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: (info) => String(info.getValue()),
    }));
  }, [columns]);

  // 新增：根据搜索词过滤数据
  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return allFetchedData;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allFetchedData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [allFetchedData, searchTerm]);

  // 修改：displayData 现在从 filteredData 中切片
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

  const updateTabDirtyState = (dirty) => {
    setIsDirty(dirty);
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tab.id ? { ...t, isDirty: dirty } : t))
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
        const responseJson = await invoke("get_query", {
          connectionId: parseInt(connectionId),
          queryName: tab.name,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0) {
          setSqlContent(response_msg || "");
          setQueryName(tab.name);
          updateTabDirtyState(false);
        } else {
          throw new Error(response_msg || "未能获取查询内容或响应格式不正确");
        }
      } catch (err) {
        console.error("Failed to load query content:", err);
        setError(`加载查询内容失败: ${err.message || err.toString()}`);
        setSqlContent("");
        updateTabDirtyState(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueryContent();
  }, [queryId, tab.id, tab.name, connectionId, setTabs]);

  const handleSqlContentChange = (e) => {
    setSqlContent(e.target.value);
    if (!isDirty) {
      updateTabDirtyState(true);
    }
  };

  const handleQueryNameChange = (e) => {
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

      const responseJson = await invoke("exe_sql", {
        sql: sqlContent,
        listNodeInfoReq: listNodeInfoReqObject,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (
        response_code === 0 &&
        response_msg &&
        response_msg.header &&
        response_msg.rows
      ) {
        const rawHeaders = response_msg.header;
        const rawRows = response_msg.rows;

        const fetchedColumns = rawHeaders.map((col) => ({
          name: col.name,
        }));

        const fetchedColumnHeadersNames = fetchedColumns.map((col) => col.name);

        const fetchedData = rawRows.map((rowArray) => {
          const rowObject = {};
          rowArray.forEach((value, index) => {
            if (fetchedColumnHeadersNames[index]) {
              rowObject[fetchedColumnHeadersNames[index]] = value;
            }
          });
          return rowObject;
        });

        setColumns(fetchedColumns);
        setAllFetchedData(fetchedData);
        // totalRows 现在通过 filteredData 计算，这里只需更新原始数据
        // setTotalRows(fetchedData.length); // 这一行现在可以移除，或让 useEffect 更新
        setExecutionTime(response_msg.execution_time_ms || 0);
        setCurrentPage(1);
      } else {
        throw new Error(response_msg || "未能获取查询结果或响应格式不正确");
      }
    } catch (err) {
      console.error("SQL execution failed:", err);
      setError(`执行 SQL 失败: ${err.message || err.toString()}`);
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
    setIsLoading(true);
    setError(null);
    try {
      const responseJson = await invoke("save_query", {
        connectionId: parseInt(connectionId),
        queryName: queryName,
        sql: sqlContent,
        queryId: queryId,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        alert("查询已成功保存!");
        updateTabDirtyState(false);

        if (!queryId && response_msg.query_id) {
          setTabs((prevTabs) =>
            prevTabs.map((t) =>
              t.id === tab.id
                ? {
                    ...t,
                    queryId: response_msg.query_id,
                    id: `sql-editor-${response_msg.query_id}`,
                    name: queryName,
                  }
                : t
            )
          );
        } else if (tab.name !== queryName) {
          setTabs((prevTabs) =>
            prevTabs.map((t) =>
              t.id === tab.id ? { ...t, name: queryName } : t
            )
          );
        }
      } else {
        throw new Error(response_msg);
      }
    } catch (err) {
      console.error("Failed to save query:", err);
      alert(`保存查询失败: ${err.message || err.toString()}`);
    } finally {
      setIsLoading(false);
    }
  }, [sqlContent, queryName, connectionId, queryId, tab.id, tab.name, setTabs]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault(); // Prevent default browser save dialog
        handleSaveQuery();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSaveQuery]);

  // 新增：当搜索词变化时，重置页码为第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 修改：totalRows 现在反映的是过滤后的数据量
  useEffect(() => {
    setTotalRows(filteredData.length);
  }, [filteredData]);

  const totalPages = Math.ceil(totalRows / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  // 移除 handleSearchData 函数，因为它不再需要

  return (
    <div className="flex flex-col h-full bg-base-100 p-4">
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
          rows="10"
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
          <table className="table table-sm table-pin-rows table-pin-cols w-full">
            {/* Table Head */}
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="bg-base-200">
                      {" "}
                      {/* Add distinct header background */}
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {/* Table Body */}
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
