import { createContext, useContext, useEffect, useRef, useState } from "react"
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import UpdateColumnDialog from "../components/updateColumnComponent"

export const PropertiesColumnContext = createContext({
  currentColumnData: {},
  setCurrentColumnData: () => {},
  sourceRows: [],
})
const PropertiesColumnPage = ({ node }) => {
  const [header, setHeader] = useState([])
  const [rows, setRows] = useState([])
  const [sourceRows, setSourceRows] = useState([])
  const [showUpdateColumnDialog, setShowUpdateColumnDialog] = useState(false)
  const [currentColumnData, setCurrentColumnData] = useState({})
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
      setSourceRows(rows)

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
          const { setCurrentColumnData, sourceRows } = useContext(
            PropertiesColumnContext
          )
          const handleCellOnClick = (index) => {
            console.log(sourceRows, index)
            setCurrentColumnData(sourceRows[index])
            setShowUpdateColumnDialog(true)
          }
          return (
            <div onClick={() => handleCellOnClick(row.index)}>
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
    <div class="scrollbar  h-[calc(100%-2rem)] w-full overflow-x-scroll overflow-y-scroll ">
      <PropertiesColumnContext.Provider
        value={{
          currentColumnData: currentColumnData,
          setCurrentColumnData: setCurrentColumnData,
          sourceRows: sourceRows,
        }}
      >
        <Dialog
          open={showUpdateColumnDialog}
          onOpenChange={setShowUpdateColumnDialog}
        >
          <UpdateColumnDialog node={node} columnData={currentColumnData} />
        </Dialog>
        <DataTable columns={header} data={rows} table={table} />
      </PropertiesColumnContext.Provider>
    </div>
  )
}
export default PropertiesColumnPage
