import { useEffect, useRef, useState } from "react"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { invoke } from "@tauri-apps/api/core"
import AceEditor from "react-ace"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import "ace-builds/src-noconflict/mode-java"
import "ace-builds/src-noconflict/mode-sql"

import { DataTable } from "../../dashboard/components/table"
import PropertiesTabsPage from "./propertiesTabsPage"

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

import useResizeObserver from "use-resize-observer"

import "ace-builds/src-noconflict/ext-language_tools"

import { tr } from "date-fns/locale"

import { Input } from "@/components/ui/input"

const PropertiesPage = ({ node, className }) => {
  return (
    <div
      className={`flex h-full w-full flex-col gap-2 ${className} bg-muted pl-1 pt-1`}
    >
      <div className="flex w-1/2 flex-row gap-2">
        <div className="flex basis-1/2 flex-row items-center justify-center gap-2">
          <span>Name</span>
          <input
            placeholder="Name"
            className="flex h-10 rounded-md  border border-input  bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex basis-1/2 flex-row items-center justify-center gap-2">
          <span>Comment</span>
          <input
            placeholder="Comment"
            className="flex h-10 rounded-md  border border-input  bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
      <Button className="ml-1 w-1/12">Update</Button>
      <PropertiesTabsPage node={node} />
    </div>
  )
}
export default PropertiesPage
