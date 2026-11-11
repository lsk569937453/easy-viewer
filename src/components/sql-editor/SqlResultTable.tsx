import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import Pagination from "../ui/Pagination";
import SearchBox from "../ui/SearchBox";
import { EmptyState } from "../ui/states";
import Toolbar from "../ui/Toolbar";
import type { TableRowData } from "./useSqlExecution";

export interface SqlResultTableProps {
  columns: { name: string }[];
  rows: TableRowData[];
  /** 过滤后总行数是否为 0：为 0 时展示空态而不是空表格 */
  isEmpty: boolean;
  loading: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  executionTime: number;
  totalRows: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** SQL 结果区：搜索/耗时/分页工具条 + 只读结果表格。 */
function SqlResultTable({
  columns,
  rows,
  isEmpty,
  loading,
  searchTerm,
  onSearchTermChange,
  executionTime,
  totalRows,
  currentPage,
  totalPages,
  onPageChange,
}: SqlResultTableProps) {
  const tableColumns = useMemo<ColumnDef<TableRowData>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: (info) => String(info.getValue()),
    }));
  }, [columns]);

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* 数据操作区 */}
      <Toolbar
        className="mt-2"
        left={
          <SearchBox
            value={searchTerm}
            onChange={onSearchTermChange}
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
              onPageChange={onPageChange}
            />
          </>
        }
      />

      {/* 结果表格 */}
      <DataTableShell
        className="m-3"
        loading={loading}
        isEmpty={isEmpty}
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
    </>
  );
}

export default SqlResultTable;
