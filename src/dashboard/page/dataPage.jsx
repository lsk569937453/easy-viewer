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
import { useToast } from "@/components/ui/use-toast"

import InsertSqlComponent from "../components/insertSqlComponent"

import "ace-builds/src-noconflict/mode-java"
import "ace-builds/src-noconflict/mode-sql"

import { DataTable } from "../../dashboard/components/table"

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"
import "ace-builds/src-noconflict/theme-xcode"
import "ace-builds/src-noconflict/ext-language_tools"

import { addCompleter } from "ace-builds/src-noconflict/ext-language_tools"
import useResizeObserver from "use-resize-observer"

import { getDeleteSql, getSQLStatement } from "../../lib/jsx-utils"

import "ace-builds/src-noconflict/ext-language_tools"

import { tr } from "date-fns/locale"
import { use } from "i18next"

import { getLevelInfos, uuid } from "../../lib/jsx-utils"
import DeleteSqlComponent from "../components/deleteSqlComponenet"

const pageCount = 100

const TableContext = createContext()
const IndeterminateCheckbox = ({ indeterminate, className = "", ...rest }) => {
  const ref = useRef()

  useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !rest.checked && indeterminate
    }
  }, [ref, indeterminate])

  return (
    <input
      type="checkbox"
      ref={ref}
      className={className + " cursor-pointer"}
      {...rest}
    />
  )
}
export default function DataPage({
  node,
  inputSql,
  readOnly = false,
  clickFlag,
}) {
  const { toast } = useToast()
  const [sql, setSql] = useState(
    inputSql || `SELECT * FROM ${node.data.name} LIMIT 100`
  )
  const [timeCost, setTimeCost] = useState(0)
  //渲染用
  const [header, setHeader] = useState([])
  //组装update用
  const [sourceHeader, setSourceHeader] = useState([])
  //组装update用
  const [sourceRows, setSourceRows] = useState([])
  const [rows, setRows] = useState([])
  const [currentRows, setCurrentRows] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [tableHeight, setTableHeight] = useState(10)
  const [showLoading, setShowLoading] = useState(false)
  const [container, setContainer] = useState(null)
  //将所有的表的修改都存储到editState中
  const [editState, setEditState] = useState([])
  const [tableNameFromSql, setTableNameFromSql] = useState("")
  const [rowSelection, setRowSelection] = useState({})
  const [showInsertDialog, setShowInsertDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [sqlOfDelete, setSqlOfDelete] = useState("")
  const hasMounted = useRef(false)

  const { ref } = useResizeObserver({
    onResize: ({ width, height }) => {
      setTableHeight(window.innerHeight - 160 - height)
    },
  })
  useEffect(() => {
    if (readOnly) {
      setSql(inputSql)
    }
  }, [inputSql])

  useEffect(() => {
    console.log(hasMounted.current)
    if (hasMounted.current) {
      exeSql()
    } else {
      hasMounted.current = true
    }
  }, [clickFlag])
  useEffect(() => {
    let currentRows = rows.slice(
      (currentPage - 1) * pageCount,
      currentPage * pageCount
    )
    setCurrentRows(currentRows)
  }, [currentPage])

  useEffect(() => {
    if (!readOnly) {
      exeSql()
    }
  }, [])

  useEffect(() => {
    fetchCompleteWords()
  }, [])
  const handleOnSaveButtonClick = async () => {
    console.log(editState)
    const sqlStatements = generateUpdateSQL(
      editState,
      sourceHeader,
      tableNameFromSql
    )
    if (sqlStatements.length === 0) {
      toast({
        variant: "destructive",
        title: "Update Sql Error",
        description: "Can not update as no primary key",
      })
      return
    }
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(sqlStatements)
    const { response_code, response_msg } = JSON.parse(
      await invoke("update_sql", {
        listNodeInfoReq: listNodeInfoReq,
        sqls: sqlStatements,
      })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Update Sql Error",
        description: response_msg,
      })
    } else {
      setEditState([])
    }
  }

  const generateUpdateSQL = (array, headers, tableName) => {
    // Assuming tableName is provided
    let sqlStatements = []

    array.forEach((item) => {
      const primaryKeyHeader = headers.find((header) => header.is_primary_key)
      const primaryKeyIndex = headers.findIndex(
        (header) => header.is_primary_key
      )

      const primaryKeyValue = sourceRows[item.index][primaryKeyIndex]
      const setClauses = []

      for (const [key, value] of Object.entries(item.valueMap)) {
        const header = headers[key]
        console.log(header, key, value)
        setClauses.push(`${header.name} = '${value}'`)
      }
      console.log(setClauses, primaryKeyHeader)
      if (primaryKeyHeader) {
        const sql = `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE ${
          primaryKeyHeader.name
        } = ${primaryKeyValue};`
        sqlStatements.push(sql)
      }
    })

    return sqlStatements
  }
  const fetchCompleteWords = async () => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    const { response_code, response_msg } = JSON.parse(
      await invoke("get_complete_words", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code == 0) {
      let completeArray = response_msg.map((item) => {
        return {
          name: item,
          value: item,
          caption: item,
          meta: "SQL",
          score: 1000,
        }
      })
      addCompleter({
        getCompletions: function (editor, session, pos, prefix, callback) {
          callback(null, completeArray)
        },
      })
    } else {
      return []
    }
  }
  const exeSql = async () => {
    setEditState([])
    setRowSelection({})
    const timer = setTimeout(() => setShowLoading(true), 500)
    var startTime = new Date()

    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    let sqlArray = getSQLStatement(sql)
    console.log(listNodeInfoReq, sqlArray)
    let response_code = 0
    let response_msg = ""
    for (const finalSql of sqlArray) {
      console.log(listNodeInfoReq, finalSql)

      const response = await invoke("exe_sql", {
        listNodeInfoReq: listNodeInfoReq,
        sql: finalSql,
      })
      let res = JSON.parse(response)
      response_code = res.response_code
      response_msg = res.response_msg
      if (response_code !== 0) {
        toast({
          variant: "destructive",
          title: "Sql Error",
          description: response_msg,
        })
        return
      }
    }
    clearTimeout(timer)

    console.log(response_code, response_msg)
    if (response_code == 0) {
      const { header, rows, table_name } = response_msg
      console.log(table_name)
      setTableNameFromSql(table_name)
      setSourceHeader(header)
      setSourceRows(rows)
      const columns = header.map((item, index) => ({
        accessorKey: String(index), // Use the index as the accessor key
        header: () => (
          <div className="flex flex-col items-center justify-center gap-1">
            <p className="font-bold text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.type_name}</p>
          </div>
        ),
        cell: ({ getValue, row: { index }, column: { id }, table }) => {
          const initialValue = getValue()
          const [value, setValue] = useState(initialValue)
          const [isEditing, setIsEditing] = useState(false)
          const { editState } = useContext(TableContext)

          const onBlur = () => {
            table.options.meta?.updateData(index, id, value)
          }

          const handleOnChange = (e) => {
            setIsEditing(true)
            setValue(e.target.value)
            setEditState((prevEditState) => {
              // Find the entry by `index`
              const entry = prevEditState.find((item) => item.index === index)
              console.log(entry)
              if (entry) {
                return prevEditState.map((item) =>
                  item.index === index
                    ? {
                        ...item,
                        valueMap: {
                          ...item.valueMap,
                          [id]: e.target.value,
                        },
                      }
                    : item
                )
              } else {
                return [
                  ...prevEditState,
                  { index: index, valueMap: { [id]: value } },
                ]
              }
            })
          }
          useEffect(() => {
            setValue(initialValue)
          }, [initialValue])
          //界面上清除了编辑状态后，修改局部的状态为false
          useEffect(() => {
            if (editState.length === 0) {
              setIsEditing(false)
            }
          }, [editState])
          return (
            <input
              className={`${isEditing ? "bg-indigo-400" : ""} w-full `}
              type="text"
              value={value}
              onChange={handleOnChange}
              onBlur={onBlur}
            />
          )
        },
      }))
      const newColumns =
        columns.length > 0
          ? [
              {
                id: "select",
                header: ({ table }) => (
                  <IndeterminateCheckbox
                    {...{
                      checked: table.getIsAllRowsSelected(),
                      indeterminate: table.getIsSomeRowsSelected(),
                      onChange: table.getToggleAllRowsSelectedHandler(),
                    }}
                  />
                ),
                cell: ({ row }) => (
                  <div>
                    <IndeterminateCheckbox
                      {...{
                        checked: row.getIsSelected(),
                        disabled: !row.getCanSelect(),
                        indeterminate: row.getIsSomeSelected(),
                        onChange: row.getToggleSelectedHandler(),
                      }}
                    />
                  </div>
                ),
              },
              ...columns,
            ]
          : []

      const transformedData = rows.map((row) =>
        row.reduce((obj, value, index) => {
          obj[String(index)] = value // Use the index as the key
          return obj
        }, {})
      )

      setHeader(newColumns)
      setRows(transformedData)
      setShowLoading(false)
    } else {
      toast({
        variant: "destructive",
        title: "Execute Sql Error",
        description: response_msg,
      })
    }
    setShowLoading(false)
    var endTime = new Date()
    var timeDiff = endTime - startTime //in ms

    var seconds = Math.round(timeDiff)
    setTimeCost(seconds)
  }

  useEffect(() => {
    setTableHeight(window.innerHeight - 220)
  }, [])

  const handleOnChange = (sql) => {
    console.log(sql)
    setSql(sql)
  }
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
    globalFilterFn: "includesString", // built-in filter function

    enableRowSelection: true, //enable row selection for all rows
    onRowSelectionChange: setRowSelection,

    state: {
      columnSizing: colSizing,
      pagination: pagination,
      rowSelection: rowSelection,
    },
  })
  const handleOnDeleteClick = () => {
    const primaryKeyIndex = sourceHeader.findIndex(
      (column) => column.is_primary_key
    )
    if (primaryKeyIndex === -1) {
      toast({
        variant: "destructive",
        title: "Delete Error",
        description: "No Primary Key",
      })
      return
    }

    const primaryValueArray = sourceRows
      .filter((row, index) => rowSelection[index])
      .map((row) => {
        return row[primaryKeyIndex]
      })
    const sql = getDeleteSql(
      node.data.name,
      sourceHeader[primaryKeyIndex].name,
      primaryValueArray
    )
    setSqlOfDelete(sql)
    setShowDeleteDialog(true)
    console.log(sql)
  }
  return (
    <div className="flex  h-full w-full flex-col	">
      <Dialog open={showInsertDialog} onOpenChange={setShowInsertDialog}>
        <InsertSqlComponent
          node={node}
          setShowInsertDialog={setShowInsertDialog}
          exeSql={exeSql}
        />
      </Dialog>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DeleteSqlComponent
          node={node}
          sqlOfDelete={sqlOfDelete}
          setShowDeleteDialog={setShowDeleteDialog}
          exeSql={exeSql}
        />
      </Dialog>
      {!readOnly && (
        <div ref={ref}>
          <AceEditor
            className=" flex max-h-[200px] min-h-[40px] basis-11/12 resize-y	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
            mode="sql"
            height="100%"
            width="100%"
            showGutter={false}
            enableBasicAutocompletion={true}
            enableSnippets={true}
            readOnly={readOnly}
            enableLiveAutocompletion={true}
            showPrintMargin={false}
            theme="xcode"
            onChange={handleOnChange}
            name="UNIQUE_ID_OF_DIV"
            fontSize={16}
            value={sql}
          />
        </div>
      )}
      <div className="flex h-8 flex-row bg-background">
        <div className="align-center align-text-center relative flex ">
          <input
            className=" flex h-full basis-16 
                border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium
                placeholder:text-muted-foreground focus:border-muted
                focus:outline-none
                disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search results"
            onChange={(e) => table.setGlobalFilter(String(e.target.value))}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-search absolute left-3 mt-1"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
            <path d="M21 21l-6 -6" />
          </svg>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-full w-7 border-none hover:bg-searchMarkerColor "
          onClick={() => setShowInsertDialog(true)}
          disabled={readOnly}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-plus stroke-yellow-500"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={Object.keys(rowSelection).length === 0}
          onClick={handleOnDeleteClick}
          className="h-full w-7 border-none hover:bg-searchMarkerColor"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-trash stroke-rose-500"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 7l16 0" />
            <path d="M10 11l0 6" />
            <path d="M14 11l0 6" />
            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
            <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
          </svg>
        </Button>
        {editState.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            className="h-full w-7 border-none hover:bg-searchMarkerColor"
            onClick={handleOnSaveButtonClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-check"
              className="stroke-teal-400"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 12l5 5l10 -10" />
            </svg>
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-full w-7 border-none hover:bg-searchMarkerColor"
          onClick={() => exeSql()}
          disabled={showLoading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            className="fill-emerald-600"
          >
            <path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A.998.998 0 0 0 5 3v18a1 1 0 0 0 .536.886zM7 4.909 17.243 12 7 19.091V4.909z" />
          </svg>
        </Button>
        <p className="py-1 text-lg	">Cost:{timeCost} ms</p>
        <Button
          variant="outline"
          size="icon"
          className="h-full w-7 border-none hover:bg-searchMarkerColor"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-chevrons-left"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M11 7l-5 5l5 5" />
            <path d="M17 7l-5 5l5 5" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-full w-7 border-none hover:bg-searchMarkerColor"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-left"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M15 6l-6 6l6 6" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-full w-7 border-none hover:bg-searchMarkerColor"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M9 6l6 6l-6 6" />
          </svg>{" "}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-full w-7 border-none hover:bg-searchMarkerColor"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-chevrons-right"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M7 7l5 5l-5 5" />
            <path d="M13 7l5 5l-5 5" />
          </svg>{" "}
        </Button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount().toLocaleString()}
          </strong>
        </span>
      </div>
      <div
        class="scrollbar relative"
        style={{
          height: tableHeight,
          overflow: showLoading ? "hidden" : "scroll",
        }}
        ref={setContainer}
      >
        {" "}
        <TableContext.Provider value={{ editState }}>
          <DataTable columns={header} data={rows} table={table} />
        </TableContext.Provider>
        <div
          className="absolute inset-0 h-full w-full"
          style={{ display: showLoading ? "block" : "none" }}
        >
          <div className="bg-red absolute inset-0 z-20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"></div>

          <div className="absolute left-[50%] top-[50%] z-20 flex translate-x-[-50%] translate-y-[-50%] flex-row border  bg-background  p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <svg
              class="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="red"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="background"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="font-bold ">Loading</p>
          </div>
        </div>
      </div>
    </div>
  )
}
