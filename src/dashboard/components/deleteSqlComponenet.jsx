import { useContext, useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"
import { format, set } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos, reloadNode, shouldWithQuote } from "../../lib/jsx-utils"
import { SidebarContext } from "../page"

const DeleteSqlComponent = ({
  node,
  sqlOfDelete,
  setShowDeleteDialog,
  exeSql,
}) => {
  const { toast } = useToast()
  const {
    handleAddPageClick,
    setShowQueryLoading,
    setQueryName,
    setBaseConfigId,
    setNodeForUpdate,
    setShowDeleteConnectionDialog,
    setShowEditConnectionDialog,
    setShowRenameQueryDialog,
    setNewQueryName,
    setShowRemoveQueryDialog,
    menulist,
    setMenulist,
    setConnectionType,
  } = useContext(SidebarContext)
  const handleOnDeleteClick = async () => {
    console.log(node)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }

    const { response_code, response_msg } = JSON.parse(
      await invoke("exe_sql", {
        listNodeInfoReq: listNodeInfoReq,
        sql: sqlOfDelete,
      })
    )
    const mesgStr = JSON.stringify(response_msg)
    console.log(response_code, response_msg)
    if (response_code === 0) {
      toast({
        title: "Delete Success",
        description: "Delete Success",
      })
      setShowDeleteDialog(false)
      exeSql()
      reloadNode(node, menulist, setMenulist)
    } else {
      toast({
        variant: "destructive",
        title: "Delete Sql Error",
        description: mesgStr,
      })
    }
    console.log(sqlOfDelete)
  }
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 flex w-1/4 translate-x-[-50%]  translate-y-[-50%] flex-col gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <div className="flex h-full w-full flex-row items-center justify-center">
          <SyntaxHighlighter
            language="sql"
            style={coy}
            className=" w-full "
            codeTagProps={{
              style: {
                whiteSpace: "normal",
              },
            }}
          >
            {sqlOfDelete}
          </SyntaxHighlighter>
        </div>
        <div className="flex h-full flex-row items-center justify-center gap-4">
          <Button
            className="basis-1/4 text-xs"
            variant="secondary"
            onClick={() => setShowDeleteDialog(false)}
          >
            {" "}
            Cancel
          </Button>
          <Button className="basis-1/4 text-xs" onClick={handleOnDeleteClick}>
            {" "}
            Confirm
          </Button>
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.DialogPortal>
  )
}
export default DeleteSqlComponent
