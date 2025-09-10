import React, { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FaPlay,
  FaSearch,
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
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default page size
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectionId = tab.connectionId;
  const queryId = tab.queryId;

  // Ref for the table container to enable scrolling
  const tableContainerRef = useRef(null);

  // Memoized columns for react-table
  const tableColumns = useMemo(() => {
    return columns.map((col) => ({
      accessorKey: col.name, // Use 'name' as accessorKey based on backend response
      header: col.name, // Use 'name' as header
      cell: (info) => String(info.getValue()), // Ensure all values are rendered as strings
    }));
  }, [columns]);

  // TanStack Table instance
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    // Add pagination, sorting, etc. if needed later
  });

  // Load initial SQL content when tab becomes active or queryId changes
  useEffect(() => {
    const fetchQueryContent = async () => {
      if (!queryId || queryId === undefined) {
        // This might be a brand new query tab, no content to fetch
        setSqlContent(tab.initialSql || "");
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Assuming a command to load a specific query's content
        // Or if the node already contained the SQL content, use that.
        // For simplicity, let's assume `tab.initialSql` holds it if available or fetch if not.
        if (tab.initialSql) {
          setSqlContent(tab.initialSql);
        } else {
          // If tab.initialSql is not pre-populated, you might need another invoke call
          // e.g., invoke("load_query_content", { query_id: queryId })
          // For now, we'll just use the empty string if not provided.
          setSqlContent("");
        }
        setQueryName(tab.name); // Ensure query name is consistent with tab name
      } catch (err) {
        console.error("Failed to load query content:", err);
        setError(`加载查询内容失败: ${err.message || err.toString()}`);
        setSqlContent("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueryContent();
  }, [queryId, tab.initialSql, tab.name]);

  // Function to execute SQL
  const handleExecuteSql = async () => {
    if (!sqlContent.trim()) {
      setError("SQL 查询不能为空。");
      return;
    }
    setIsLoading(true);
    setError(null);
    setData([]); // Clear previous data
    setColumns([]);
    setExecutionTime(0);
    setTotalRows(0);

    try {
      const responseJson = await invoke("execute_sql", {
        connection_id: parseInt(connectionId), // Ensure connectionId is integer
        sql: sqlContent,
        page: currentPage,
        page_size: pageSize,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        const {
          columns: resColumns,
          data: resData,
          total_rows,
          execution_time_ms,
        } = response_msg;

        // Backend should return columns as [{ name: "col1" }, { name: "col2" }]
        // And data as [[val1, val2], ...]
        const mappedData = resData.map((rowArray) => {
          const rowObject = {};
          rowArray.forEach((value, index) => {
            if (resColumns[index]) {
              rowObject[resColumns[index].name] = value;
            }
          });
          return rowObject;
        });

        setColumns(resColumns);
        setData(mappedData);
        setTotalRows(total_rows);
        setExecutionTime(execution_time_ms);
      } else {
        throw new Error(response_msg);
      }
    } catch (err) {
      console.error("SQL execution failed:", err);
      setError(`执行 SQL 失败: ${err.message || err.toString()}`);
      setColumns([]);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save the SQL query (update the existing one)
  const handleSaveQuery = async () => {
    if (!sqlContent.trim()) {
      setError("SQL 查询不能为空，无法保存。");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const responseJson = await invoke("save_query", {
        connection_id: parseInt(connectionId),
        query_name: queryName, // Allow user to edit query name if a text input is added
        sql: sqlContent,
        query_id: queryId, // Pass queryId for update
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        alert("查询已成功保存!");
        // If the query name was edited, update the tab's name
        if (setTabs && tab.name !== queryName) {
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
  };

  const totalPages = Math.ceil(totalRows / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      handleExecuteSql(); // Re-execute SQL for new page
    }
  };

  const handleSearchData = () => {
    // For large datasets, this would typically involve re-executing SQL with a WHERE clause
    // For demonstration, it's just a placeholder.
    alert(
      `搜索功能待实现。搜索词: "${searchTerm}"。通常需要重新执行带有WHERE子句的SQL。`
    );
  };

  return (
    <div className="flex flex-col h-full bg-base-100 p-4">
      {/* Action Bar */}
      <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
        <input
          type="text"
          className="input input-bordered input-sm font-semibold text-lg flex-grow max-w-xs"
          value={queryName}
          onChange={(e) => setQueryName(e.target.value)}
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
          title="保存查询"
        >
          <FaSave />
          保存
        </button>
      </div>

      {/* SQL Editor Area */}
      <div className="mb-4 flex-shrink-0">
        <textarea
          className="textarea textarea-bordered w-full font-mono text-sm resize-y"
          rows="10"
          placeholder="在此输入 SQL 查询..."
          value={sqlContent}
          onChange={(e) => setSqlContent(e.target.value)}
        ></textarea>
      </div>

      {/* Error Display */}
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
          <input
            type="text"
            placeholder="搜索数据 (功能待实现)..."
            className="input input-bordered input-sm w-48"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" onClick={handleSearchData}>
            <FaSearch />
          </button>
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
        {isLoading && data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : data.length > 0 ? (
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
            没有数据可显示。请执行 SQL 查询。
          </div>
        )}
      </div>
    </div>
  );
}

export default SqlEditorTabContent;
