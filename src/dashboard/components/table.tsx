import {
    ColumnDef,
    ColumnSizingState,
    flexRender,
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