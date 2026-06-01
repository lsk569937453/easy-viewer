// src/components/TableDetailPanel.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FaPlus,
  FaTrashAlt,
  FaSave,
  FaSearch,
  FaInfoCircle,
  FaUndo,
} from "react-icons/fa";
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuid } from "uuid";
import TableDetailPage from "./TableDetailPage";

// 导入 TanStack Table 相关的 hooks 和工具
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const EditableCell = ({ getValue, row, column, onCellChange, onCellInput }) => {
  const initialValue = getValue();
  const ref = useRef(null);

  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) {
      ref.current.textContent =
        initialValue !== null && initialValue !== undefined
          ? String(initialValue)
          : "";
    }
  }, [initialValue, isFocused]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    console.log(
      `DEBUG: EditableCell blurred - Row ID: ${row.original.id}, Column: ${column.id}`
    );
    if (ref.current) {
      const currentText = ref.current.textContent;
      if (currentText !== initialValue) {
        onCellChange(row.original, column.id, currentText);
      }
    }
    onCellInput(null, null, null);
  }, [initialValue, onCellChange, onCellInput, row.original, column.id]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    console.log(
      `DEBUG: EditableCell focused - Row ID: ${row.original.id}, Column: ${column.id}, Current Value: ${initialValue}`
    );
    const range = document.createRange();
    if (ref.current) {
      range.selectNodeContents(ref.current);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    onCellInput(
      row.original.id,
      column.id,
      ref.current ? ref.current.textContent : initialValue
    );
  }, [onCellInput, row.original.id, column.id, initialValue]);

  const handleInput = useCallback(
    (e) => {
      console.log(
        `DEBUG: EditableCell input - Row ID: ${row.original.id}, Column: ${column.id}, Text: ${e.target.textContent}`
      );
      onCellInput(row.original.id, column.id, e.target.textContent);
    },
    [onCellInput, row.original.id, column.id]
  );

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.target.blur();
      e.preventDefault();
    }
  }, []);

  const displayValue = String(initialValue !== null && initialValue !== undefined ? initialValue : "");

  return (
    <div className="relative w-full">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`px-1 py-0.5 cursor-text ${
          isFocused
            ? "outline-none bg-base-300 overflow-y-auto whitespace-pre-wrap break-words"
            : "truncate"
        }`}
        style={{
          fontSize: "12px",
          lineHeight: "1.4",
          maxWidth: isFocused ? "none" : "200px"
        }}
        title={isFocused ? "" : displayValue}
      >
        {displayValue}
      </div>
    </div>
  );
};

function TableWorkspacePanel({ initialSql, activeTabNode, connectionDetails }) {
  const [activeSubTab, setActiveSubTab] = useState("data");
  const [sqlQuery, setSqlQuery] = useState(initialSql || "");
  const [tableData, setTableData] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [hasChanges, setHasChanges] = useState(false);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [currentlyEditingCell, setCurrentlyEditingCell] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    let changesDetected = false;
    if (currentlyEditingCell) {
      changesDetected = true;
    } else {
      changesDetected =
        JSON.stringify(tableData) !== JSON.stringify(originalTableData);
    }
    setHasChanges(changesDetected);
  }, [tableData, originalTableData, currentlyEditingCell]);

  useEffect(() => {
    console.log(
      "DEBUG: Initial SQL/Active Tab Node changed. SQL:",
      initialSql,
      "Node:",
      activeTabNode?.name
    );
    setSqlQuery(initialSql || "");
    if (activeTabNode && activeSubTab === "data") {
      console.log("DEBUG: Triggering fetchTableData with:", initialSql);
      fetchTableData(initialSql);
    } else {
      console.log("DEBUG: Clearing table data (not 'data' sub-tab or no node)");
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentlyEditingCell(null);
      setCurrentPage(1); // 清除数据时重置分页
    }
  }, [initialSql, activeTabNode, activeSubTab]);

  // 获取表数据
  const fetchTableData = async (query) => {
    if (!query || !activeTabNode || !activeTabNode.path) {
      console.log("DEBUG: fetchTableData skipped (missing query/node info).");
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentlyEditingCell(null);
      setCurrentPage(1); // 清除数据时重置分页
      return;
    }

    console.log("DEBUG: Calling invoke('exe_sql') with query:", query);
    try {
      const listNodeInfoReqObject = { level_infos: activeTabNode.path };

      const responseJson = await invoke("exe_sql", {
        sql: query,
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

        const fetchedColumnHeaders = rawHeaders.map((col) => col.name);

        const fetchedData = rawRows.map((row) => {
          const rowObject = {};
          fetchedColumnHeaders.forEach((headerName, index) => {
            rowObject[headerName] = row[index];
          });
          rowObject.id = rowObject.id || uuid(); // 使用 uuid 生成唯一ID
          return rowObject;
        });

        console.log(
          "DEBUG: Data fetched successfully. Rows:",
          fetchedData.length,
          "Headers:",
          fetchedColumnHeaders
        );
        setTableData(fetchedData);
        setColumnHeaders(fetchedColumnHeaders);
        setOriginalTableData(JSON.parse(JSON.stringify(fetchedData))); // 深拷贝，作为原始数据
        setCurrentlyEditingCell(null); // 清除编辑状态
        setCurrentPage(1);
      } else {
        console.error(
          "DEBUG: Failed to fetch table data or format incorrect:",
          response_msg
        );
        setTableData([]);
        setColumnHeaders([]);
        setOriginalTableData([]);
        setCurrentlyEditingCell(null);
        setCurrentPage(1); // 清除数据时重置分页
      }
    } catch (error) {
      console.error("DEBUG: Error executing SQL query:", error);
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentlyEditingCell(null);
      setCurrentPage(1); // 清除数据时重置分页
    }
  };

  const handleSqlQueryChange = (e) => {
    setSqlQuery(e.target.value);
  };

  const handleExecuteSql = () => {
    console.log("DEBUG: Execute SQL button clicked. Query:", sqlQuery);
    fetchTableData(sqlQuery);
  };

  const handleCellInput = useCallback((rowId, columnId, value) => {
    // console.log("DEBUG: Cell input. Row ID:", rowId, "Column ID:", columnId, "Value:", value); // 可能会非常频繁，根据需要开启
    // setCurrentlyEditingCell(rowId ? { rowId, columnId, value } : null);
  }, []);

  const handleCellChange = useCallback((originalRow, columnId, value) => {
    console.log(
      "DEBUG: Cell change committed. Row ID:",
      originalRow.id,
      "Column ID:",
      columnId,
      "New Value:",
      value
    );
    setTableData((prevTableData) => {
      const rowIndex = prevTableData.findIndex((r) => r.id === originalRow.id);
      if (rowIndex === -1) {
        console.warn(
          "DEBUG: Could not find original row to update (on blur commit):",
          originalRow
        );
        return prevTableData; // 未找到则返回之前的状态
      }

      const updatedData = [...prevTableData]; // 创建新数组以避免直接修改状态
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [columnId]: value,
      };
      return updatedData; // 返回新状态
    });
    setCurrentlyEditingCell(null); // 提交后清除实时编辑状态
  }, []);

  // 添加新行
  const handleAddRow = useCallback(() => {
    console.log("DEBUG: Add row clicked.");
    const newRow = columnHeaders.reduce(
      (acc, col) => ({ ...acc, [col]: "" }),
      {}
    );
    newRow.id = uuid(); // 给新行一个唯一ID
    setTableData([...tableData, newRow]);

    setCurrentPage(Math.ceil((tableData.length + 1) / itemsPerPage));
  }, [tableData, columnHeaders, itemsPerPage]);

  const handleDeleteRow = useCallback(
    async (rowToDelete) => {
      console.log("DEBUG: Delete row clicked. Row ID:", rowToDelete.id);
      if (!window.confirm("确定要删除此行数据吗？此操作不可撤销。")) {
        return;
      }

      try {
        const responseJson = await invoke("delete_table_row", {
          configId: connectionDetails.base_config_id,
          tableName: activeTabNode.name,
          rowId: rowToDelete.id, // 传递要删除的行ID
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0) {
          alert("数据删除成功！");
          // 删除成功后，重新获取数据以更新UI和原始数据状态
          fetchTableData(sqlQuery);
        } else {
          alert(`数据删除失败: ${response_msg}`);
          console.error("DEBUG: Delete failed:", response_msg);
        }
      } catch (error) {
        console.error("DEBUG: Error deleting data:", error);
        alert("删除数据时发生错误！");
      }
    },
    [connectionDetails, activeTabNode, sqlQuery, fetchTableData]
  );

  // 保存修改
  const handleSaveChanges = async () => {
    console.log("DEBUG: Save changes clicked. Current tableData:", tableData);

    try {
      const responseJson = await invoke("update_table_data", {
        configId: connectionDetails.base_config_id,
        tableName: activeTabNode.name,
        data: tableData, // 当前的 tableData
        originalData: originalTableData, // 原始数据，用于后端对比差异
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        setOriginalTableData(JSON.parse(JSON.stringify(tableData))); // 将当前 tableData 设置为新的原始数据
        setCurrentlyEditingCell(null); // 保存成功后清除实时编辑状态
        alert("数据保存成功！");
        console.log("DEBUG: Data saved successfully.");
      } else {
        alert(`数据保存失败: ${response_msg}`);
        console.error("DEBUG: Save failed:", response_msg);
      }
    } catch (error) {
      console.error("DEBUG: Error saving data:", error);
      alert("保存数据时发生错误！");
    }
  };

  // 取消修改，将 tableData 恢复到 originalTableData
  const handleCancelChanges = useCallback(() => {
    console.log("DEBUG: Cancel changes clicked.");
    setTableData(JSON.parse(JSON.stringify(originalTableData))); // 深拷贝原始数据，恢复到当前数据
    setCurrentlyEditingCell(null); // 取消修改后，清除实时编辑状态
    // 取消修改后，当前页可能超出总页数，重置到第一页
    setCurrentPage(1);
  }, [originalTableData]);

  // 根据搜索词过滤数据
  const filteredTableData = useMemo(() => {
    const data = tableData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    );
    // console.log("DEBUG: Filtered data count:", data.length, "Search term:", debouncedSearchTerm); // 可能会频繁，根据需要开启
    return data;
  }, [tableData, debouncedSearchTerm]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredTableData.length / itemsPerPage);
  }, [filteredTableData.length, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTableData.slice(startIndex, endIndex);
  }, [filteredTableData, currentPage, itemsPerPage]);

  const columns = useMemo(() => {
    const dataColumns = columnHeaders.map((headerName) => ({
      accessorKey: headerName,
      header: headerName,
      cell: (info) => (
        <EditableCell
          getValue={info.getValue}
          row={info.row}
          column={info.column}
          onCellChange={handleCellChange}
          onCellInput={handleCellInput}
        />
      ),
    }));

    // 添加操作列
    const actionColumn = {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <button
          className="btn btn-error btn-sm btn-circle"
          onClick={() => handleDeleteRow(row.original)}
          title="删除此行"
        >
          <FaTrashAlt />
        </button>
      ),
      enableResizing: false,
      size: 80,
      minSize: 60,
      maxSize: 100,
    };

    return [...dataColumns, actionColumn];
  }, [columnHeaders, handleCellChange, handleCellInput, handleDeleteRow]);

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col h-full">
      <div role="tablist" className="tabs tabs-boxed">
        <a
          role="tab"
          className={`tab ${activeSubTab === "properties" ? "tab-active" : ""}`}
          onClick={() => setActiveSubTab("properties")}
        >
          Properties
        </a>
        <a
          role="tab"
          className={`tab ${activeSubTab === "data" ? "tab-active" : ""}`}
          onClick={() => setActiveSubTab("data")}
        >
          Data
        </a>
        <a
          role="tab"
          className={`tab ${activeSubTab === "diagram" ? "tab-active" : ""}`}
          onClick={() => setActiveSubTab("diagram")}
        >
          Diagram
        </a>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === "properties" && (
            // 将原来的内容替换为 TableDetailPage 组件
            <TableDetailPage 
                activeTabNode={activeTabNode} 
            />
        )}

        {activeSubTab === "data" && (
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <textarea
                className="textarea textarea-bordered w-full h-10 min-h-[40px] max-h-[200px] resize-y font-mono text-sm"
                placeholder="在此输入 SQL 查询..."
                value={sqlQuery}
                onChange={handleSqlQueryChange}
              ></textarea>
              <button
                className="btn btn-primary mt-2"
                onClick={handleExecuteSql}
              >
                执行 SQL
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center flex-wrap gap-2 mb-4 p-2 bg-base-200 rounded-md">
                <div className="flex-1 min-w-[200px] relative">
                  <input
                    type="text"
                    placeholder="检索表内容..."
                    className="input input-bordered w-full pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60" />
                </div>

                {filteredTableData.length > 0 && (
                  <p className="text-sm text-base-content/70 flex items-center gap-2 whitespace-nowrap">
                    总行数: {filteredTableData.length}
                    <span
                      className="tooltip tooltip-right"
                      data-tip="表格单元格可直接点击编辑"
                    >
                      <FaInfoCircle className="text-info cursor-pointer" />
                    </span>
                  </p>
                )}

                {totalPages > 0 && (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span>每页显示:</span>
                    <select
                      className="select select-bordered select-sm"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // 改变每页显示数量时重置到第一页
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                )}

                {totalPages > 0 && (
                  <div className="join whitespace-nowrap">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      «
                    </button>
                    <button className="join-item btn btn-sm">
                      页 {currentPage} / {totalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      »
                    </button>
                  </div>
                )}

                <button
                  className="btn btn-ghost btn-circle"
                  title="新增数据"
                  onClick={handleAddRow}
                >
                  <FaPlus size="1.2em" />
                </button>
                {hasChanges && (
                  <>
                    <button
                      className="btn btn-warning" // “取消修改”按钮
                      onClick={handleCancelChanges}
                    >
                      <FaUndo className="mr-2" /> 取消修改
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={handleSaveChanges}
                    >
                      <FaSave className="mr-2" /> 保存修改
                    </button>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-auto rounded-lg border border-base-300">
                {filteredTableData.length === 0 && !sqlQuery ? (
                  <div className="flex justify-center items-center h-full text-base-content/60">
                    <p>输入SQL并执行，或点击左侧的表节点。</p>
                  </div>
                ) : filteredTableData.length === 0 && sqlQuery ? (
                  <div className="flex justify-center items-center h-full text-base-content/60">
                    <p>没有数据。</p>
                  </div>
                ) : (
                  <table className="table table-zebra w-full" style={{ fontSize: "12px" }}>
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              style={{ width: "150px", fontSize: "12px" }}
                            >
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
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} style={{ fontSize: "12px" }}>
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              style={{ width: "150px" }}
                            >
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
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "diagram" && (
          <div className="prose">
            <h3>表结构图</h3>
            <p>此区域将显示表的结构和关系图。</p>
            <div role="alert" className="alert alert-info mt-4">
              <FaInfoCircle />
              <span>图表功能仍在开发中。</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TableWorkspacePanel;
