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
import { Input } from "@/components/ui/input"
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

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

import useResizeObserver from "use-resize-observer"

import "ace-builds/src-noconflict/ext-language_tools"

import { tr } from "date-fns/locale"

import { getLevelInfos, uuid } from "../../lib/jsx-utils"

const PropertiesColumnPage = ({ node }) => {
  const [header, setHeader] = useState([])
  const [rows, setRows] = useState([])

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 100,
  })
  const [colSizing, setColSizing] = useState({})
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
  })

  useEffect(() => {
    exeSql()
  }, [])

  const exeSql = async () => {
    // const timer = setTimeout(() => setShowLoading(true), 500)
    var startTime = new Date()

    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("show_columns", { listNodeInfoReq: listNodeInfoReq })
    )

    console.log(response_code, response_msg)
    if (response_code == 0) {
      const { header, rows } = response_msg

      const columns = header.map((item, index) => ({
        accessorKey: String(index), // Use the index as the accessor key
        header: () => (
          <div className="flex flex-col items-center justify-center gap-1">
            <p className="font-bold text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.type_name}</p>
          </div>
        ),
        cell: ({ row }) => {
          const currentData = row.getValue(String(index))
          return (
            <div>
              {currentData ? (
                <p>{currentData}</p>
              ) : (
                <p className="text-muted-foreground">NULL</p>
              )}
            </div>
          )
        },
      }))
      const transformedData = rows.map((row) =>
        row.reduce((obj, value, index) => {
          obj[String(index)] = value // Use the index as the key
          return obj
        }, {})
      )
      setHeader(columns)
      setRows(transformedData)
    }
    var endTime = new Date()
    var timeDiff = endTime - startTime //in ms

    var seconds = Math.round(timeDiff)
  }

  return (
    <div class="overflow-x-auto overflow-y-auto scrollbar">
      <DataTable
        columns={header}
        data={rows}
        table={table}
        className=" h-full w-full overflow-hidden"
      />
    </div>
  )
}
export default PropertiesColumnPage
