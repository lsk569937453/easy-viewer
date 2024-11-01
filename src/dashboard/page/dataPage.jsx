
import { useState, useEffect, useRef } from "react";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import * as AlertDialog from "@radix-ui/react-alert-dialog";

import AceEditor from "react-ace";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { invoke } from "@tauri-apps/api/core";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-sql";
import { DataTable } from "../../dashboard/components/table";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-iplastic";
import useResizeObserver from "use-resize-observer";
import {

    getCoreRowModel,
    useReactTable, getFilteredRowModel,
    getPaginationRowModel
} from "@tanstack/react-table";
import "ace-builds/src-noconflict/ext-language_tools";

import { uuid, getLevelInfos } from "../../lib/utils";
import { tr } from "date-fns/locale";
import { Filter } from "lucide-react";
const pageCount = 100;
export default function DataPage({ node }) {
    const [sql, setSql] = useState(`SELECT * FROM ${node.data.name} LIMIT 100`);
    const [timeCost, setTimeCost] = useState(0);
    const [header, setHeader] = useState([]);
    const [rows, setRows] = useState([]);
    const [currentRows, setCurrentRows] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableHeight, setTableHeight] = useState(10);
    const [showLoading, setShowLoading] = useState(false);
    const [container, setContainer] = useState(null);

    const { ref } = useResizeObserver({
        onResize: ({ width, height }) => {
            setTableHeight(window.innerHeight - 160 - height);
        },
    });
    useEffect(() => {
        let currentRows = rows.slice((currentPage - 1) * pageCount, currentPage * pageCount);
        setCurrentRows(currentRows);
    }, [currentPage]);

    useEffect(() => {
        exeSql();
    }, []);
    // const Filter = ({
    //     column
    // }) => {


    //     const columnFilterValue = column.getFilterValue()

    //     return (
    //         <input
    //             className="w-36 border shadow rounded"
    //             onChange={e => column.setFilterValue(e.target.value)}
    //             onClick={e => e.stopPropagation()}
    //             placeholder={`Search...`}
    //             type="text"
    //             value={(columnFilterValue ?? '')}
    //         />
    //     )
    // }
    const exeSql = async () => {
        var startTime = new Date();

        const listNodeInfoReq = {
            level_infos: getLevelInfos(node),
        };
        console.log(listNodeInfoReq);
        const { response_code, response_msg } = JSON.parse(await invoke("exe_sql", { listNodeInfoReq: listNodeInfoReq, sql: sql }));
        console.log(response_code, response_msg);
        if (response_code == 0) {
            const { header, rows } = response_msg;

            const columns = header.map((item, index) => ({
                accessorKey: String(index), // Use the index as the accessor key
                header: () => (
                    <div className="flex flex-col justify-center items-center gap-1" key={index}>
                        <p className="text-foreground font-bold">{item.name}</p>
                        <p className="text-muted-foreground text-xs">{item.type_name}</p>
                    </div>
                ),
                cell: ({ row }) => {
                    const currentData = row.getValue(String(index));
                    return (
                        <div >
                            {currentData ? (
                                <p>{currentData}</p>
                            ) : (
                                <p className="text-muted-foreground">NULL</p>
                            )}
                        </div>
                    );
                },
                Filter: ({ column }) => <Filter column={column} />,
            }));
            const transformedData = rows.map((row) =>
                row.reduce((obj, value, index) => {
                    obj[String(index)] = value; // Use the index as the key
                    return obj;
                }, {})
            );
            setHeader(columns);
            setRows(transformedData);
            // let currentRows = rows.slice((currentPage - 1) * pageCount, currentPage * pageCount);
            // setCurrentRows(currentRows);
        }
        var endTime = new Date();
        var timeDiff = endTime - startTime; //in ms
        // strip the ms
        // timeDiff /= 1000;

        // get seconds 
        var seconds = Math.round(timeDiff);
        setTimeCost(seconds);
    }

    useEffect(() => {
        setTableHeight(window.innerHeight - 200);
    }, []);

    const handleOnChange = (sql) => {
        setSql(sql);
    }
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 100,
    })
    const [colSizing, setColSizing] = useState({});

    const table = useReactTable({
        data: rows,
        columns: header,
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        onColumnSizingChange: setColSizing,
        onPaginationChange: setPagination,
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),

        state: {
            columnSizing: colSizing,
            pagination: pagination,
        },
    });
    return (
        <div className="w-full  flex flex-col h-full	">

            {/* <textarea className="flex min-h-[40px] w-full  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
                value={sql} onChange={(e) => setSql(e.target.value)} /> */}
            <div className="flex flex-row " ref={ref}>
                <AceEditor
                    className=" resize-y flex min-h-[22px] max-h-[200px] basis-11/12	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
                    mode="sql"
                    height="100%"
                    width="100%"
                    showGutter={false}
                    enableBasicAutocompletion={true}
                    showPrintMargin={false}
                    theme="iplastic"
                    onChange={handleOnChange}
                    name="UNIQUE_ID_OF_DIV"
                    fontSize={16}
                    value={sql}
                />
            </div>
            <div className="flex flex-row h-8 bg-background">
                <div className="flex align-center relative align-text-center ">
                    <input className=" h-full basis-16 flex 
                border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground
                focus:outline-none focus:border-muted
                pl-10
                disabled:cursor-not-allowed disabled:opacity-50" placeholder="Search results" />
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-search absolute left-3 mt-1"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                </div>
                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor" onClick={() => exeSql()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A.998.998 0 0 0 5 3v18a1 1 0 0 0 .536.886zM7 4.909 17.243 12 7 19.091V4.909z" /></svg>                </Button>
                <span className="flex items-center">Cost:{timeCost} ms</span>

                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor" onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevrons-left"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M11 7l-5 5l5 5" /><path d="M17 7l-5 5l5 5" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor" onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-left"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 6l-6 6l6 6" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 6l6 6l-6 6" /></svg>                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7 hover:bg-searchMarkerColor" onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevrons-right"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 7l5 5l-5 5" /><path d="M13 7l5 5l-5 5" /></svg>                </Button>
                <span className="flex items-center gap-1">
                    <div>Page</div>
                    <strong>
                        {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount().toLocaleString()}
                    </strong>
                </span>

            </div>
            <div class="overflow-x-scroll overflow-y-scroll scrollbar relative" style={{ height: tableHeight }} ref={setContainer}>
                <AlertDialog.Root open={showLoading} onOpenChange={setShowLoading}>

                    <AlertDialog.Overlay asChild={false} className="absolute pointer-events-none inset-0 z-20 bg-red backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <AlertDialog.Content asChild={true} className="absolute pointer-events-none left-[50%] top-[50%] z-20 flex flex-row translate-x-[-50%] translate-y-[-50%]  border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
                        <div className="bg-ring pointer-events-none">
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="background" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p>Loading</p>
                        </div>
                    </AlertDialog.Content>

                </AlertDialog.Root>

                <DataTable columns={header} data={rows} table={table} />

            </div>

        </div >
    )


}