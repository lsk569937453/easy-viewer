
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

import "ace-builds/src-noconflict/ext-language_tools";
export default function DataPage() {
    const [sql, setSql] = useState("SELECT * FROM all_types_table LIMIT 100");

    const handleOnChange = (sql) => {
        setSql(sql);
    }
    return (
        <div className="w-full h-full flex flex-col">
            {/* <textarea className="flex min-h-[40px] w-full  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
                value={sql} onChange={(e) => setSql(e.target.value)} /> */}
            <div className="flex flex-row">
                <AceEditor
                    className=" resize-y flex min-h-[40px] basis-11/12	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="flex flex-row">
                <Input></Input>
                <Button>sss</Button>

            </div>
            <Table>
                <TableCaption>A list of your recent invoices.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">INV001</TableCell>
                        <TableCell>Paid</TableCell>
                        <TableCell>Credit Card</TableCell>
                        <TableCell className="text-right">$250.00</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

        </div>
    )


}