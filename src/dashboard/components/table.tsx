import { useState } from "react"
import {
  Column,
  ColumnDef,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
  Table as Table2,
  useReactTable,
} from "@tanstack/react-table"

import { ColumnResizer } from "./column-resizer"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

const Filter = ({ column }: { column: Column<any, any> }) => {
  const columnFilterValue = column.getFilterValue()

  return (
    <input
      className="w-36 rounded border bg-muted shadow"
      onChange={(e) => column.setFilterValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder={`Search...`}
      type="text"
      value={(columnFilterValue ?? "") as string}
    />
  )
}
export const DataTable = <TValue,>({
  columns,
  data,
  table,
}: {
  columns: ColumnDef<any, TValue>[]
  data: []
  table: any
}) => {
  return (
    <Table style={{ width: table.getTotalSize() }}>
      <TableHeader className="sticky top-0 bg-muted">
        {table.getHeaderGroups().map((headerGroup: any) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header: any) => {
              return (
                <TableHead
                  key={header.id}
                  className="relative w-6 border"
                  style={{
                    width: header.getSize(),
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {header.column.getCanFilter() ? (
                    <div className="flex items-center justify-center p-1">
                      <Filter column={header.column} />
                    </div>
                  ) : null}
                  <ColumnResizer header={header} />
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row: any) => (
            <TableRow
              key={row.id}
              //   data-state={row.getIsSelected() && "selected"}
              //   className="data-[state=selected]:none"
            >
              {row.getVisibleCells().map((cell: any) => (
                <TableCell
                  key={cell.id}
                  style={{
                    width: cell.column.getSize(),
                    minWidth: cell.column.columnDef.minSize,
                  }}
                  className="border"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className=" w-full text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
