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
}: {
    columns: ColumnDef<any, TValue>[];
    data: [];
}) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 100,
    })
    const [colSizing, setColSizing] = useState<ColumnSizingState>({});

    const table = useReactTable({
        data,
        columns,
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        onColumnSizingChange: setColSizing,
        onPaginationChange: setPagination,
        getPaginationRowModel: getPaginationRowModel(),

        state: {
            columnSizing: colSizing,
            pagination: pagination,
        },
    });

    return (
        <Table style={{ width: table.getTotalSize() }}>
            <TableHeader className="sticky top-0 bg-accent">
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
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
                    table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                        >
                            {row.getVisibleCells().map((cell) => (
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