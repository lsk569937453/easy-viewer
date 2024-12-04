import { createContext, useContext, useEffect, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"

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

import { getLevelInfos } from "../../lib/jsx-utils"
import { PropertiesColumnContext } from "../page/propertiesColumnPage"

const DeleteColumnComponent = ({ node, columnData }) => {
  const { toast } = useToast()

  const {
    setCurrentColumnData,
    sourceRows,
    exeSql,
    setShowUpdateColumnDialog,
    setShowDeleteColumnDialog,
  } = useContext(PropertiesColumnContext)
  const handleCancelOnClick = () => {
    setShowDeleteColumnDialog(false)
  }
  const handleConfirmOnClick = async () => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    const response = await invoke("remove_column", {
      listNodeInfoReq: listNodeInfoReq,
      columnName: columnData[0],
    })
    const { response_code, response_msg } = JSON.parse(response)

    if (response_code == 0) {
      exeSql()
      setShowDeleteColumnDialog(false)
    } else {
      toast({
        variant: "destructive",
        title: "Sql Error",
        description: response_msg,
      })
    }
  }
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 flex w-1/4 translate-x-[-50%]  translate-y-[-50%] flex-col gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <p>
          Are you sure you want to delete the column of
          <span className="ml-1 bg-yellow-400 font-bold">{columnData[0]}?</span>
        </p>
        <div className="flex h-full flex-row items-center justify-center gap-4">
          <Button
            className="basis-1/4 text-xs"
            variant="secondary"
            size="sm"
            onClick={handleCancelOnClick}
          >
            {" "}
            Cancel
          </Button>
          <Button
            className="basis-1/4 text-xs"
            onClick={handleConfirmOnClick}
            size="sm"
          >
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
export default DeleteColumnComponent
