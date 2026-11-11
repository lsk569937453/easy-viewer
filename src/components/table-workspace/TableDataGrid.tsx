import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { FaTrashAlt } from "react-icons/fa";
import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import { EmptyState } from "../ui/states";
import EditableCell from "./EditableCell";
import type { EditableRow } from "./types";

export interface TableDataGridProps {
  columnHeaders: string[];
  rows: EditableRow[];
  /** 过滤后总行数是否为 0：为 0 时展示空态而不是空表格 */
  isEmpty: boolean;
  sqlQuery: string;
  toolbar: ReactNode;
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
  onRequestDelete: (row: EditableRow) => void;
}

/**
 * 数据表：工具条插槽 + 可编辑单元格表格。
 * 列定义与原 `TableWorkspacePanel` 内联 useMemo 一致（数据列 + 操作列）。
 */
function TableDataGrid({
  columnHeaders,
  rows,
  isEmpty,
  sqlQuery,
  toolbar,
  onCellChange,
  onCellInput,
  onRequestDelete,
}: TableDataGridProps) {
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
            onCellChange={onCellChange}
            onCellInput={onCellInput}
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
          onClick={() => onRequestDelete(row.original)}
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
  }, [columnHeaders, onCellChange, onCellInput, onRequestDelete]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {toolbar}

      <DataTableShell
        isEmpty={isEmpty}
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

export default TableDataGrid;
