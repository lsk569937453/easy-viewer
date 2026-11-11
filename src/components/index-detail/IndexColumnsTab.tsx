import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import type { IndexColumn } from "../../utils/indexSql";
import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import { EmptyState } from "../ui/states";

export interface IndexColumnsTabProps {
  indexColumns: IndexColumn[];
}

/** 索引列页签：列定义固定，使用 @tanstack/react-table 渲染。 */
function IndexColumnsTab({ indexColumns }: IndexColumnsTabProps) {
  const columns = useMemo<ColumnDef<IndexColumn>[]>(
    () => [
      { accessorKey: "columnName", header: "列名" },
      { accessorKey: "seqInIndex", header: "序号" },
      { accessorKey: "collation", header: "排序" },
      { accessorKey: "cardinality", header: "基数" },
      { accessorKey: "subPart", header: "前缀长度" },
      { accessorKey: "nullable", header: "可为空" },
    ],
    [],
  );

  const table = useReactTable({
    data: indexColumns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTableShell
      isEmpty={indexColumns.length === 0}
      placeholder={
        <EmptyState
          compact
          title="没有索引列"
          description="该索引没有返回列定义。"
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
                  className="max-w-[240px] truncate"
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
  );
}

export default IndexColumnsTab;
