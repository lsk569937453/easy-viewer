
import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import AceEditor from "react-ace";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { invoke } from "@tauri-apps/api/core";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-sql";

import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-iplastic";
import useResizeObserver from "use-resize-observer";

import "ace-builds/src-noconflict/ext-language_tools";

import { uuid, getLevelInfos } from "../../lib/utils";
const pageCount = 100;
export default function DataPage({ node }) {
    const [sql, setSql] = useState(`SELECT * FROM ${node.data.name} LIMIT 100`);
    const [timeCost, setTimeCost] = useState(0);
    const [header, setHeader] = useState([]);
    const [rows, setRows] = useState([]);
    const [currentRows, setCurrentRows] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableHeight, setTableHeight] = useState(10);
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
            setHeader(header);
            setRows(rows);
            let currentRows = rows.slice((currentPage - 1) * pageCount, currentPage * pageCount);
            setCurrentRows(currentRows);
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
            <div className="flex flex-row h-8 gap-1">
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
                <p className="py-1 text-lg	">Cost:{timeCost} ms</p>
                <p className="py-1">Page 9 of 13</p>
                <Button className=" h-full " onClick={() => currentPage != 1 && setCurrentPage(currentPage - 1)}>previous</Button>
                <Button className=" h-full" onClick={() => currentPage != rows.length / pageCount && setCurrentPage(currentPage + 1)}>next</Button>

            </div>
            <div class="overflow-x-scroll overflow-y-scroll scrollbar" style={{ height: tableHeight }}>

                <table className="text-sm  overflow-scroll	">
                    <TableHeader className="sticky top-0 bg-accent">
                        <TableRow>
                            {header.map((item, index) => (
                                <TableHead className="w-6" key={index}>
                                    <div className="flex flex-col">
                                        <p className="text-foreground">{item.name}</p>
                                        <p className="text-muted-foreground text-xs">{item.type_name}</p>
                                    </div>
                                </TableHead>
                            ))}

                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentRows.map((item, index) => (
                            <TableRow key={index}>
                                {item.map((data, index) => (
                                    <TableCell key={index} className="w-3">{data}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </table>
            </div>

        </div >
    )


}