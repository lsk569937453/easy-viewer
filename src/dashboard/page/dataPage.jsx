
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

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-sql";

import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-iplastic";
import { ChevronRightIcon } from "@radix-ui/react-icons"
import useResizeObserver from "use-resize-observer";

import "ace-builds/src-noconflict/ext-language_tools";


export default function DataPage() {
    const [sql, setSql] = useState("SELECT * FROM all_types_table LIMIT 100");

    const [tableHeight, setTableHeight] = useState(10);
    const { ref } = useResizeObserver({
        onResize: ({ width, height }) => {
            setTableHeight(window.innerHeight - 160 - height);
        },
    });


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
                    className=" resize-y flex min-h-[20px] max-h-[200px] basis-11/12	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
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
                <input className=" h-full basis-16 flex w-full  
                border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground
                focus:outline-none focus:border-muted
                
                disabled:cursor-not-allowed disabled:opacity-50" />

                <Button variant="outline" size="icon" className="border-none h-full w-7">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="border-none h-full w-7">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A.998.998 0 0 0 5 3v18a1 1 0 0 0 .536.886zM7 4.909 17.243 12 7 19.091V4.909z" /></svg>                </Button>
                <p className="py-1 text-lg	">Cost:3456 ms</p>
            </div>
            <div class="overflow-x-scroll overflow-y-scroll scrollbar" style={{ height: tableHeight }}>

                <table className="text-sm  overflow-scroll	">
                    <TableHeader className="sticky top-0 bg-accent">
                        <TableRow>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                            <TableHead className="w-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>  <TableRow>
                            <TableCell className="w-3">INV001</TableCell>
                            <TableCell className="w-3">Paid</TableCell>
                            <TableCell className="w-3">Credit Card</TableCell>
                            <TableCell className="w-3">$250.00</TableCell>
                        </TableRow>
                    </TableBody>
                </table>
            </div>

        </div>
    )


}