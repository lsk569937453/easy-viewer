// src/components/TableDetailPanel.jsx

import type { Column, ColumnDef, Row } from "@tanstack/react-table";
import {
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
import { FaPlay, FaPlus, FaSave, FaTrashAlt, FaUndo } from "react-icons/fa";
import { v4 as uuid } from "uuid";
import type { ConnectionSummary, ExeSqlResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import TableDetailPage from "./TableDetailPage";
import ActionButton from "./ui/ActionButton";
import ConfirmDialog from "./ui/ConfirmDialog";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import Pagination from "./ui/Pagination";
import SearchBox from "./ui/SearchBox";
import StatusChip from "./ui/StatusChip";
import { EmptyState } from "./ui/states";
import Toolbar from "./ui/Toolbar";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SUB_TABS = [
  { id: "properties", label: "结构" },
  { id: "data", label: "数据" },
  { id: "diagram", label: "关系图" },
] as const;

type EditableRow = Record<string, string | null> & { id: string };

interface EditableCellProps {
  getValue: () => unknown;
  row: Row<EditableRow>;
  column: Column<EditableRow, unknown>;
  onCellChange: (
    originalRow: EditableRow,
    columnId: string,
    value: string | null,
  ) => void;
  onCellInput: (
    rowId: string | null,
    columnId: string | null,
    value: unknown,
  ) => void;
}

const useDebounce = <T,>(value: T, delay: number): T => {
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

const EditableCell = ({
  getValue,
  row,
  column,
  onCellChange,
  onCellInput,
}: EditableCellProps) => {
  const initialValue = getValue();
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() =>
    initialValue !== null && initialValue !== undefined
      ? String(initialValue)
      : "",
  );

  // 未聚焦时跟随外部数据刷新（重新执行 SQL、新增/删除行后）
  useEffect(() => {
    if (isFocused) return;
    setDraft(
      initialValue !== null && initialValue !== undefined
        ? String(initialValue)
        : "",
    );
  }, [initialValue, isFocused]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const original = String(
      initialValue !== null && initialValue !== undefined ? initialValue : "",
    );
    if (draft !== original) {
      onCellChange(row.original, column.id, draft);
    }
    onCellInput(null, null, null);
  }, [draft, initialValue, onCellChange, onCellInput, row.original, column.id]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onCellInput(row.original.id, column.id, draft);
  }, [onCellInput, row.original.id, column.id, draft]);

  return (
    <textarea
      rows={1}
      wrap={isFocused ? "soft" : "off"}
      aria-label="单元格内容"
      value={draft}
      title={isFocused ? undefined : draft}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(event) => {
        setDraft(event.target.value);
        onCellInput(row.original.id, column.id, event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`w-full resize-none rounded-[3px] bg-transparent px-1 py-0.5 text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
        isFocused
          ? "bg-base-300 whitespace-pre-wrap break-words"
          : "overflow-hidden text-ellipsis"
      }`}
    />
  );
};

interface TableWorkspacePanelProps {
  initialSql?: string;
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

function TableWorkspacePanel({
  initialSql,
  activeTabNode,
  connectionDetails,
}: TableWorkspacePanelProps) {
  const [activeSubTab, setActiveSubTab] = useState("data");
  const [sqlQuery, setSqlQuery] = useState(initialSql || "");
  const [tableData, setTableData] = useState<EditableRow[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [hasChanges, setHasChanges] = useState(false);
  const [originalTableData, setOriginalTableData] = useState<EditableRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [rowPendingDelete, setRowPendingDelete] = useState<EditableRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

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
  const fetchTableData = async (query?: string) => {
    if (!query || !activeTabNode?.path) {
      setTableData([]);
      setColumnHeaders([]);
      setOriginalTableData([]);
      setCurrentPage(1); // 清除数据时重置分页
      return;
    }

    try {
      const listNodeInfoReqObject = { level_infos: activeTabNode.path };

      const responseJson = await invoke<string>("exe_sql", {
        sql: query,
        listNodeInfoReq: listNodeInfoReqObject,
      });
      const { response_code, response_msg } =
        parseBaseResponse<ExeSqlResponse>(responseJson);

      if (response_code === 0) {
        const rawHeaders = response_msg.header;
        const rawRows = response_msg.rows;

        const fetchedColumnHeaders = rawHeaders.map((col) => col.name);

        const fetchedData: EditableRow[] = rawRows.map((row) => {
          const rowObject: EditableRow = { id: "" };
          fetchedColumnHeaders.forEach((headerName, index) => {
            rowObject[headerName] = row[index] ?? null;
          });
          rowObject.id = rowObject.id || uuid(); // 使用 uuid 生成唯一ID
          return rowObject;
        });

        setTableData(fetchedData);
        setColumnHeaders(fetchedColumnHeaders);
        setOriginalTableData(structuredClone(fetchedData)); // 深拷贝，作为原始数据
        setIsEditing(false);
        setCurrentPage(1);
      } else {
        console.error(
          "DEBUG: Failed to fetch table data or format incorrect:",
          response_msg,
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

  const handleSqlQueryChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSqlQuery(e.target.value);
  };

  const handleExecuteSql = () => {
    fetchTableData(sqlQuery);
  };

  const handleCellInput = useCallback(
    (rowId: string | null, _columnId: string | null, _value: unknown) => {
      setIsEditing(!!rowId);
    },
    [],
  );

  const handleCellChange = useCallback(
    (originalRow: EditableRow, columnId: string, value: string | null) => {
      setTableData((prevTableData) => {
        const rowIndex = prevTableData.findIndex(
          (r) => r.id === originalRow.id,
        );
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
    },
    [],
  );

  // 添加新行
  const handleAddRow = useCallback(() => {
    const newRow: EditableRow = { id: "" };
    columnHeaders.forEach((col) => {
      newRow[col] = "";
    });
    newRow.id = uuid(); // 给新行一个唯一ID
    setTableData([...tableData, newRow]);

    setCurrentPage(Math.ceil((tableData.length + 1) / itemsPerPage));
  }, [tableData, columnHeaders, itemsPerPage]);

  // 删除改为「确认对话框 + 提交」，替换原来的 window.confirm 阻塞式确认
  const requestDeleteRow = useCallback((rowToDelete: EditableRow) => {
    setRowPendingDelete(rowToDelete);
  }, []);

  const confirmDeleteRow = useCallback(async () => {
    const rowToDelete = rowPendingDelete;
    if (!rowToDelete) return;

    setDeleting(true);
    try {
      const idColumn = columnHeaders[0]; // 使用第一列作为标识列
      const realRowId = rowToDelete[idColumn]; // 获取真实的主键值
      const responseJson = await invoke<string>("delete_table_row", {
        baseConfigId: connectionDetails.base_config_id,
        tableName: activeTabNode.name,
        rowId: realRowId,
        idColumn,
        listNodeInfoReq: { level_infos: activeTabNode.path },
      });
      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        showSuccess("数据删除成功！");
        setRowPendingDelete(null);
        // 删除成功后，重新获取数据以更新UI和原始数据状态
        await fetchTableData(sqlQuery);
      } else {
        showError(`数据删除失败: ${response_msg}`);
      }
    } catch (error) {
      showError(`删除数据时发生错误！${getErrorMessage(error)}`);
    } finally {
      setDeleting(false);
    }
  }, [
    rowPendingDelete,
    columnHeaders,
    connectionDetails,
    activeTabNode,
    sqlQuery,
  ]);

  // 保存修改
  const handleSaveChanges = async () => {
    // 对比 tableData 和 originalTableData，生成 UPDATE/INSERT SQL
    const sqls: string[] = [];
    const idColumn = columnHeaders[0]; // 使用第一列作为标识列

    for (let i = 0; i < tableData.length; i++) {
      const current = tableData[i];
      const original = originalTableData.find((o) => o.id === current.id);

      if (!original) {
        // 新增行：生成 INSERT SQL
        const columns: string[] = [];
        const values: string[] = [];
        columnHeaders.forEach((col) => {
          if (
            current[col] !== null &&
            current[col] !== undefined &&
            String(current[col]) !== ""
          ) {
            columns.push(`\`${col}\``);
            values.push(`'${String(current[col]).replace(/'/g, "''")}'`);
          }
        });
        if (columns.length > 0) {
          sqls.push(
            `INSERT INTO \`${activeTabNode.name}\` (${columns.join(", ")}) VALUES (${values.join(", ")})`,
          );
        }
        continue;
      }

      const changes: string[] = [];
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
          `UPDATE \`${activeTabNode.name}\` SET ${changes.join(", ")} WHERE \`${idColumn}\` = ${idValue}`,
        );
      }
    }

    if (sqls.length === 0) {
      showError("没有检测到变更。");
      return;
    }

    try {
      const listNodeInfoReq = { level_infos: activeTabNode.path };
      const responseJson = await invoke<string>("update_record", {
        listNodeInfoReq,
        sqls,
      });
      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        setOriginalTableData(structuredClone(tableData));
        setIsEditing(false);
        showSuccess("数据保存成功！");
      } else {
        showError(`数据保存失败: ${response_msg}`);
        console.error("Save failed:", response_msg);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      showError(`保存数据时发生错误: ${getErrorMessage(error)}`);
    }
  };

  // 取消修改，将 tableData 恢复到 originalTableData
  const handleCancelChanges = useCallback(() => {
    setTableData(structuredClone(originalTableData)); // 深拷贝原始数据，恢复到当前数据
    setIsEditing(false);
    // 取消修改后，当前页可能超出总页数，重置到第一页
    setCurrentPage(1);
  }, [originalTableData]);

  // 根据搜索词过滤数据
  const filteredTableData = useMemo(() => {
    const data = tableData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
      ),
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

  const columns = useMemo<ColumnDef<EditableRow, unknown>[]>(() => {
    const dataColumns: ColumnDef<EditableRow, unknown>[] = columnHeaders.map(
      (headerName) => ({
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
      }),
    );

    // 添加操作列
    const actionColumn: ColumnDef<EditableRow, unknown> = {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <button
          className="app-icon-btn hover:text-error"
          onClick={() => requestDeleteRow(row.original)}
          title="删除此行"
          aria-label="删除该行"
        >
          <FaTrashAlt size="0.75em" aria-hidden="true" />
        </button>
      ),
      enableResizing: false,
      size: 80,
      minSize: 60,
      maxSize: 100,
    };

    return [...dataColumns, actionColumn];
  }, [columnHeaders, handleCellChange, handleCellInput, requestDeleteRow]);

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 子视图：结构 / 数据 / 关系图（原来混用英文 Properties/Data/Diagram） */}
      <div
        role="tablist"
        className="flex h-9 flex-shrink-0 items-stretch border-b border-hairline bg-base-200/40 px-1"
      >
        {SUB_TABS.map((subTab) => (
          <button
            key={subTab.id}
            type="button"
            role="tab"
            aria-selected={activeSubTab === subTab.id}
            className={`-mb-px border-b-2 px-3 text-xs transition-colors ${
              activeSubTab === subTab.id
                ? "border-primary font-medium text-base-content"
                : "border-transparent text-base-content/55 hover:text-base-content/85"
            }`}
            onClick={() => setActiveSubTab(subTab.id)}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeSubTab === "properties" && (
          // 将原来的内容替换为 TableDetailPage 组件
          <TableDetailPage activeTabNode={activeTabNode} />
        )}

        {activeSubTab === "data" && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-2 flex items-start gap-2">
              <textarea
                className="textarea h-16 min-h-0 w-full resize-y rounded-[var(--radius-control)] border-hairline bg-base-100 font-mono text-xs leading-relaxed"
                placeholder="在此输入 SQL 查询…"
                aria-label="SQL 查询"
                name="sqlQuery"
                value={sqlQuery}
                onChange={handleSqlQueryChange}
              />
              <ActionButton
                variant="primary"
                size="sm"
                className="mt-0.5"
                icon={<FaPlay size="0.8em" aria-hidden="true" />}
                onClick={handleExecuteSql}
              >
                执行
              </ActionButton>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <Toolbar
                className="mb-2 rounded-[var(--radius-control)] border border-hairline"
                left={
                  <SearchBox
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="检索表内容…"
                    ariaLabel="检索表内容"
                    className="max-w-xs"
                  />
                }
                right={
                  <>
                    {filteredTableData.length > 0 ? (
                      <StatusChip tone="info">单元格可直接编辑</StatusChip>
                    ) : null}
                    <Pagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={filteredTableData.length}
                      pageSize={itemsPerPage}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(size) => {
                        setItemsPerPage(size);
                        setCurrentPage(1); // 改变每页显示数量时重置到第一页
                      }}
                    />
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      icon={<FaPlus size="0.75em" aria-hidden="true" />}
                      title="新增数据"
                      onClick={handleAddRow}
                    >
                      新增
                    </ActionButton>
                    {hasChanges ? (
                      <>
                        <ActionButton
                          size="sm"
                          icon={<FaUndo size="0.8em" aria-hidden="true" />}
                          onClick={handleCancelChanges}
                        >
                          取消
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="primary"
                          icon={<FaSave size="0.8em" aria-hidden="true" />}
                          onClick={() => void handleSaveChanges()}
                        >
                          保存
                        </ActionButton>
                      </>
                    ) : null}
                  </>
                }
              />

              <DataTableShell
                isEmpty={filteredTableData.length === 0}
                placeholder={
                  <EmptyState
                    compact
                    title={sqlQuery ? "没有数据" : "还没有执行查询"}
                    description={
                      sqlQuery
                        ? "换个筛选条件，或编辑上方 SQL 后重新执行。"
                        : "输入 SQL 并执行，或点击左侧的表节点。"
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
                          <td key={cell.id} className="max-w-[320px]">
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
              </DataTableShell>
            </div>
          </div>
        )}

        {activeSubTab === "diagram" && (
          <EmptyState
            title="关系图尚未实现"
            description="当前版本提供「结构」与「数据」两个视图，关系图功能仍在开发中。"
          />
        )}
      </div>

      <ConfirmDialog
        open={rowPendingDelete !== null}
        title="删除这一行数据？"
        description={`将删除 ${
          rowPendingDelete && columnHeaders[0]
            ? String(rowPendingDelete[columnHeaders[0]] ?? "")
            : "该行"
        }，操作不可撤销。`}
        confirmText="删除"
        busy={deleting}
        onConfirm={() => void confirmDeleteRow()}
        onCancel={() => setRowPendingDelete(null)}
      />
    </div>
  );
}

export default TableWorkspacePanel;
