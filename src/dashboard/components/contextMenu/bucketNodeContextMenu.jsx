import React, { useContext, useEffect, useRef, useState } from "react"
import { ControlledMenu, MenuItem, SubMenu } from "@szhsin/react-menu"
import { invoke } from "@tauri-apps/api/core"

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import {
  formatMap,
  getCreateColumnSql,
  getCreateIndexForColumn,
  getLevelInfos,
  getQueryName,
  getRootNode,
} from "../../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../../page"
import DumpDataPage from "../../page/commonDumpDataPage"
import PropertiesPage from "../../page/propertiesPage"
import QueryPage from "../../page/queryPage"

const BucketNodeContextMenu = ({ node }) => {
  const { toast } = useToast()

  const {
    handleAddPageClick,
    setShowQueryLoading,
    setQueryName,
    setBaseConfigId,
    setNodeForUpdate,
    setShowDeleteConnectionDialog,
    setShowEditConnectionDialog,
    setIsSave,
    setConnectionType,
    menulist,
    setMenulist,
  } = useContext(SidebarContext)

  const {
    setShowDeleteBucketDialog,
    showDeleteBucketDialog,
    setShowCreateFolderDialog,
    showCreateFolderDialog,
    setShowRenameBucketDialog,
    showRenameBucketDialog,
  } = useContext(MainPageDialogContext)

  const handleDropColumnOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    setShowDropIndexDialog(true)
    setNodeForUpdate(node)
  }
  const handleCopyNameOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    navigator.clipboard.writeText(node.data.name).then(() => {
      toast({
        title: "Copied to clipboard",
      })
    })
  }
  const handleNewFolderOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    setShowCreateFolderDialog(true)
    setNodeForUpdate(node)
  }
  const handleDeleteBucketOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    setShowDeleteBucketDialog(true)
    setNodeForUpdate(node)
  }

  return (
    <>
      <MenuItem onClick={(e) => handleCopyNameOnClick(e)} className="text-xs">
        Copy Name
      </MenuItem>
      <Separator />
      <MenuItem onClick={(e) => handleNewFolderOnClick(e)} className="text-xs">
        New Folder
      </MenuItem>
      <Separator />
      <MenuItem
        onClick={(e) => handleDeleteBucketOnClick(e)}
        className="text-xs"
      >
        Delete
      </MenuItem>

      <Separator />
      <MenuItem onClick={(e) => handleDropColumnOnClick(e)} className="text-xs">
        Download
      </MenuItem>
      <MenuItem onClick={(e) => handleDropColumnOnClick(e)} className="text-xs">
        Upload File
      </MenuItem>
      <MenuItem onClick={(e) => handleDropColumnOnClick(e)} className="text-xs">
        Upload Folder
      </MenuItem>
    </>
  )
}
export default BucketNodeContextMenu
