import React, { useContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

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
import { useToast } from "@/components/ui/use-toast"

import {
  formatMap,
  getLevelInfos,
  getQueryName,
  getRootNode,
  reloadNode,
} from "../../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../../page"

const CreateFolderDialog = ({ node }) => {
  const { toast } = useToast()

  const { showCreateFolderDialog, setShowCreateFolderDialog } = useContext(
    MainPageDialogContext
  )
  const { menulist, setMenulist } = useContext(SidebarContext)
  const handleDropColumnOnClick = async (e) => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("drop_column", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Drop Column Error",
        description: response_msg,
      })
      return
    } else {
      toast({
        title: "Success",
        description: "Drop Column Success",
      })
      reloadNode(node, menulist, setMenulist)
    }
  }
  return (
    <Dialog
      open={showCreateFolderDialog}
      onOpenChange={setShowCreateFolderDialog}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Drop The Column</DialogTitle>
          <DialogDescription>
            Are you sure you want to drop the {node?.data?.name}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <div className="flex flex-row items-center justify-center gap-2">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDropColumnOnClick}
              >
                Drop
              </Button>
            </div>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default CreateFolderDialog
