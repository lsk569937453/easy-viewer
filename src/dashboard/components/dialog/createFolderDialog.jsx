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
import { Input } from "@/components/ui/input"
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
  const [folderName, setFolderName] = useState("")
  const { showCreateFolderDialog, setShowCreateFolderDialog } = useContext(
    MainPageDialogContext
  )
  const { menulist, setMenulist } = useContext(SidebarContext)
  const handleCreateFolderOnClick = async (e) => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("create_folder", {
        listNodeInfoReq: listNodeInfoReq,
        folderName: folderName,
      })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Create Folder Error",
        description: response_msg,
      })
      return
    } else {
      toast({
        title: "Success",
        description: "Create Folder Success",
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
          <DialogTitle>Create Folder</DialogTitle>
          <div className="p-4">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          </div>
        </DialogHeader>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <div className="flex flex-row items-center justify-center gap-2">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateFolderOnClick}>
                Create
              </Button>
            </div>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default CreateFolderDialog
