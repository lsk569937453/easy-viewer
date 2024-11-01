import {
    ColumnDef,
    ColumnSizingState,
    flexRender, Column, Table as Table2,
    getCoreRowModel,
    useReactTable, PaginationState,
    getPaginationRowModel
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { ColumnResizer } from "./column-resizer";
import { useState } from "react";

export const DataTable = <TValue,>({
    columns,
    data,
    table,
}: {
    columns: ColumnDef<any, TValue>[];
    data: [];
    table: any;
}) => {

    const Filter = ({
        column
    }: {
        column: Column<any, any>
    }) => {
        const columnFilterValue = column.getFilterValue()

        return (
            <input
                className="w-36 border shadow rounded"
                onChange={e => column.setFilterValue(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder={`Search...`}
                type="text"
                value={(columnFilterValue ?? '') as string}
            />
        )
    }
    return (
        <Table style={{ width: table.getTotalSize() }}>
            <TableHeader className="sticky top-0 bg-accent">
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
                                        <div className="p-1">
                                            <Filter column={header.column} />
                                        </div>
                                    ) : null}
                                    <ColumnResizer header={header} />
                                </TableHead>
                            );
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row: any) => (
                        <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
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
                        <TableCell colSpan={columns.length} className="h-24 w-full text-center">
                            No results.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};