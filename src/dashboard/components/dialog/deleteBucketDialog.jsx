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

const DeleteBucketDialog = ({ node }) => {
  const { toast } = useToast()

  const { showDeleteBucketDialog, setShowDeleteBucketDialog } = useContext(
    MainPageDialogContext
  )
  const { menulist, setMenulist } = useContext(SidebarContext)
  const handleDeleteBucketOnClick = async (e) => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("delete_bucket", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Delete Error",
        description: response_msg,
      })
      return
    } else {
      toast({
        title: "Success",
        description: "Delete Success",
      })
      reloadNode(node, menulist, setMenulist)
    }
  }
  const getTitle = () => {
    if (node?.data?.iconName === "bucket") {
      return "Delete The Bucket"
    } else {
      return "Delete The Folder"
    }
  }
  return (
    <Dialog
      open={showDeleteBucketDialog}
      onOpenChange={setShowDeleteBucketDialog}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription className="text-nowrap">
            Are you sure you want to delete the{" "}
            <span className=" font-bold">{node?.data?.name}?</span>
          </DialogDescription>
          {node?.data?.iconName === "bucket" && (
            <DialogDescription className="font-bold text-red-500">
              A bucket can only be deleted if it's empty.
            </DialogDescription>
          )}
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
                onClick={handleDeleteBucketOnClick}
              >
                Delete
              </Button>
            </div>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default DeleteBucketDialog
