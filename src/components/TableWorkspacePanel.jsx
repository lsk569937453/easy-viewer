// src/components/TableDetailPanel.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { showSuccess, showError } from "../utils/showToast.jsx";
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
  const [isEditing, setIsEditing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const dataChanged =
      JSON.stringify(tableData) !== JSON.stringify(originalTableData);
    setHasChanges(dataChanged || isEditing);
  }, [tableData, originalTableData, isEditing]);

  useEffect(() => {
    setSqlQuery(initialSql || "");
    if (activeTabNode && activeSubTab === "data") {
      fetchTableData(initialSql);
    } else {
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentPage(1); // 清除数据时重置分页
    }
  }, [initialSql, activeTabNode, activeSubTab]);

  // 获取表数据
  const fetchTableData = async (query) => {
    if (!query || !activeTabNode || !activeTabNode.path) {
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentPage(1); // 清除数据时重置分页
      return;
    }

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

        setTableData(fetchedData);
        setColumnHeaders(fetchedColumnHeaders);
        setOriginalTableData(JSON.parse(JSON.stringify(fetchedData))); // 深拷贝，作为原始数据
        setIsEditing(false);
        setCurrentPage(1);
      } else {
        console.error(
          "DEBUG: Failed to fetch table data or format incorrect:",
          response_msg
        );
        setTableData([]);
        setColumnHeaders([]);
        setOriginalTableData([]);
          setCurrentPage(1); // 清除数据时重置分页
      }
    } catch (error) {
      console.error("DEBUG: Error executing SQL query:", error);
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentPage(1); // 清除数据时重置分页
    }
  };

  const handleSqlQueryChange = (e) => {
    setSqlQuery(e.target.value);
  };

  const handleExecuteSql = () => {
    fetchTableData(sqlQuery);
  };

  const handleCellInput = useCallback((rowId, columnId, value) => {
    setIsEditing(!!rowId);
  }, []);

  const handleCellChange = useCallback((originalRow, columnId, value) => {
    setTableData((prevTableData) => {
      const rowIndex = prevTableData.findIndex((r) => r.id === originalRow.id);
      if (rowIndex === -1) {
        return prevTableData; // 未找到则返回之前的状态
      }

      const updatedData = [...prevTableData]; // 创建新数组以避免直接修改状态
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [columnId]: value,
      };
      return updatedData; // 返回新状态
    });
  }, []);

  // 添加新行
  const handleAddRow = useCallback(() => {
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
      if (!window.confirm("确定要删除此行数据吗？此操作不可撤销。")) {
        return;
      }

      try {
        const idColumn = columnHeaders[0]; // 使用第一列作为标识列
        const realRowId = rowToDelete[idColumn]; // 获取真实的主键值
        const listNodeInfoReq = { level_infos: activeTabNode.path };
        const responseJson = await invoke("delete_table_row", {
          baseConfigId: connectionDetails.base_config_id,
          tableName: activeTabNode.name,
          rowId: realRowId,
          idColumn,
          listNodeInfoReq,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0) {
          showSuccess("数据删除成功！");
          // 删除成功后，重新获取数据以更新UI和原始数据状态
          fetchTableData(sqlQuery);
        } else {
          showError(`数据删除失败: ${response_msg}`);
          console.error("DEBUG: Delete failed:", response_msg);
        }
      } catch (error) {
        console.error("DEBUG: Error deleting data:", error);
        showError(`删除数据时发生错误！${error.message || error}`);
      }
    },
    [connectionDetails, activeTabNode, sqlQuery, fetchTableData]
  );

  // 保存修改
  const handleSaveChanges = async () => {
    // 对比 tableData 和 originalTableData，生成 UPDATE/INSERT SQL
    const sqls = [];
    const idColumn = columnHeaders[0]; // 使用第一列作为标识列

    for (let i = 0; i < tableData.length; i++) {
      const current = tableData[i];
      const original = originalTableData.find(
        (o) => o.id === current.id
      );

      if (!original) {
        // 新增行：生成 INSERT SQL
        const columns = [];
        const values = [];
        columnHeaders.forEach((col) => {
          if (current[col] !== null && current[col] !== undefined && String(current[col]) !== "") {
            columns.push(`\`${col}\``);
            values.push(`'${String(current[col]).replace(/'/g, "''")}'`);
          }
        });
        if (columns.length > 0) {
          sqls.push(
            `INSERT INTO \`${activeTabNode.name}\` (${columns.join(", ")}) VALUES (${values.join(", ")})`
          );
        }
        continue;
      }

      const changes = [];
      columnHeaders.forEach((col) => {
        if (String(current[col]) !== String(original[col])) {
          const val =
            current[col] === null || current[col] === undefined
              ? "NULL"
              : `'${String(current[col]).replace(/'/g, "''")}'`;
          changes.push(`\`${col}\` = ${val}`);
        }
      });

      if (changes.length > 0) {
        const idValue =
          original[idColumn] === null || original[idColumn] === undefined
            ? "NULL"
            : `'${String(original[idColumn]).replace(/'/g, "''")}'`;
        sqls.push(
          `UPDATE \`${activeTabNode.name}\` SET ${changes.join(", ")} WHERE \`${idColumn}\` = ${idValue}`
        );
      }
    }

    if (sqls.length === 0) {
      showError("没有检测到变更。");
      return;
    }

    try {
      const listNodeInfoReq = { level_infos: activeTabNode.path };
      const responseJson = await invoke("update_record", {
        listNodeInfoReq,
        sqls,
      });
      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        setOriginalTableData(JSON.parse(JSON.stringify(tableData)));
        setIsEditing(false);
        showSuccess("数据保存成功！");
      } else {
        showError(`数据保存失败: ${response_msg}`);
        console.error("Save failed:", response_msg);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      showError(`保存数据时发生错误: ${error.message || error}`);
    }
  };

  // 取消修改，将 tableData 恢复到 originalTableData
  const handleCancelChanges = useCallback(() => {
    setTableData(JSON.parse(JSON.stringify(originalTableData))); // 深拷贝原始数据，恢复到当前数据
    setIsEditing(false);
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
                    <thead className="sticky top-0 z-10">
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
