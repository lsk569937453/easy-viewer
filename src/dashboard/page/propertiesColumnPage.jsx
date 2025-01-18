import { createContext, useContext, useEffect, useRef, useState } from "react"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import * as Tooltip from "@radix-ui/react-tooltip"
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

import { getLevelInfos, getRootNode, uuid } from "../../lib/jsx-utils"
import DeleteColumnComponent from "../components/deleteColumnComponent"
import UpdateColumnComponent from "../components/updateColumnComponent"

export const PropertiesColumnContext = createContext({
  currentColumnData: {},
  setCurrentColumnData: () => {},
  sourceRows: [],
  setShowUpdateColumnDialog: () => {},
  exeSql: () => {},
  setShowDeleteColumnDialog: () => {},
  node: {},
})
const usePropertiesColumnActions = () => {
  const {
    setCurrentColumnData,
    sourceRows,
    setShowUpdateColumnDialog,
    setShowDeleteColumnDialog,
    node,
  } = useContext(PropertiesColumnContext)

  const handleCellOnClick = (rowIndex) => {
    const rootNode = getRootNode(node)
    console.log(sourceRows, rowIndex)
    //sqlite
    if (rootNode.data.connectionType === 3) {
      return
    }
    setCurrentColumnData(sourceRows[rowIndex])
    setShowUpdateColumnDialog(true)
  }
  const handleOnDeleteClick = (rowIndex) => {
    setCurrentColumnData(sourceRows[rowIndex])
    setShowDeleteColumnDialog(true)
  }

  return { handleCellOnClick, handleOnDeleteClick }
}
const PropertiesColumnPage = ({ node }) => {
  const rootNode = getRootNode(node)
  console.log(rootNode)
  const [header, setHeader] = useState([])
  const [rows, setRows] = useState([])
  const [sourceRows, setSourceRows] = useState([])

  const [showUpdateColumnDialog, setShowUpdateColumnDialog] = useState(false)
  const [showDeleteColumnDialog, setShowDeleteColumnDialog] = useState(false)
  const [connectionType, setConnectionType] = useState(
    rootNode.data.connectionType
  )

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
      const addActionsColumn = connectionType !== 3
      const columns = [
        ...header.map((item, index) => ({
          accessorKey: String(index), // Use the index as the accessor key
          header: () => (
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="font-bold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.type_name}</p>
            </div>
          ),
          cell: ({ row }) => {
            const currentData = row.getValue(String(index))
            const { handleCellOnClick } = usePropertiesColumnActions()

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
        })),
        ...(addActionsColumn
          ? [
              {
                accessorKey: "actions", // Unique accessor key for the extra column
                header: () => (
                  <p className="font-bold text-foreground">Actions</p>
                ),

                cell: ({ row }) => {
                  const { handleCellOnClick, handleOnDeleteClick } =
                    usePropertiesColumnActions()

                  return (
                    <div className="flex gap-2">
                      <Tooltip.Provider>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-full w-7 border-none bg-muted hover:bg-background"
                              onClick={() => handleCellOnClick(row.index)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="icon icon-tabler icons-tabler-outline icon-tabler-trash stroke-foreground"
                              >
                                <path
                                  stroke="none"
                                  d="M0 0h24v24H0z"
                                  fill="none"
                                />
                                <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                                <path d="M13.5 6.5l4 4" />
                              </svg>
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-muted px-[15px] py-2.5 text-[15px] leading-none text-foreground shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                              sideOffset={5}
                            >
                              <p>Edit Column</p>
                              <Tooltip.Arrow className="fill-white" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <Tooltip.Provider>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-full w-7 border-none bg-muted hover:bg-background"
                              onClick={() => handleOnDeleteClick(row.index)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="icon icon-tabler icons-tabler-outline icon-tabler-trash stroke-rose-500"
                              >
                                <path
                                  stroke="none"
                                  d="M0 0h24v24H0z"
                                  fill="none"
                                />
                                <path d="M4 7l16 0" />
                                <path d="M10 11l0 6" />
                                <path d="M14 11l0 6" />
                                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                              </svg>
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-muted px-[15px] py-2.5 text-[15px] leading-none text-foreground shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                              sideOffset={5}
                            >
                              <p>Delete Column</p>
                              <Tooltip.Arrow className="fill-white" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </div>
                  )
                },
              },
            ]
          : []),
      ]
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
    <div class="scrollbar h-full w-full overflow-x-auto overflow-y-auto ">
      <PropertiesColumnContext.Provider
        value={{
          currentColumnData: currentColumnData,
          setCurrentColumnData: setCurrentColumnData,
          sourceRows: sourceRows,
          setShowUpdateColumnDialog: setShowUpdateColumnDialog,
          exeSql: exeSql,
          setShowDeleteColumnDialog: setShowDeleteColumnDialog,
          node: node,
        }}
      >
        <Dialog
          open={showDeleteColumnDialog}
          onOpenChange={setShowDeleteColumnDialog}
        >
          <DeleteColumnComponent node={node} columnData={currentColumnData} />
        </Dialog>
        <Dialog
          open={showUpdateColumnDialog}
          onOpenChange={setShowUpdateColumnDialog}
        >
          <UpdateColumnComponent node={node} columnData={currentColumnData} />
        </Dialog>
        <DataTable columns={header} data={rows} table={table} />
      </PropertiesColumnContext.Provider>
    </div>
  )
}
export default PropertiesColumnPage
