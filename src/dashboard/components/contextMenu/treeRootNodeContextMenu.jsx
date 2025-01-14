import React, { useContext, useEffect, useRef, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"

import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import { formatMap, getRootNode } from "../../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../../page"

const TreeRootNodeContextMenu = ({ node }) => {
  const { toast } = useToast()

  const {
    handleAddPageClick,
    setShowQueryLoading,
    setQueryName,
    setBaseConfigId,
    setNodeForUpdate,
    setIsSave,
    setConnectionType,
    menulist,
    setMenulist,
  } = useContext(SidebarContext)
  const { setShowDeleteConnectionDialog, setShowEditConnectionDialog } =
    useContext(MainPageDialogContext)
  const handleEditConnectionClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    console.log(e)
    setNodeForUpdate(node)
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    console.log(
      rootNode.data.connectionType,
      formatMap.get(rootNode.data.connectionType)
    )
    setConnectionType(formatMap.get(rootNode.data.connectionType))
    setShowEditConnectionDialog(true)
    setIsSave(true)
  }
  const handleDeleteConnectionClick = (e) => {
    e.syntheticEvent.stopPropagation()

    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    setShowDeleteConnectionDialog(true)
  }
  const handleCopyConnectionOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    navigator.clipboard.writeText(node.data.name).then(() => {
      toast({
        title: "Copied to clipboard",
      })
    })
  }
  return (
    <div className="h-full w-full bg-muted">
      <MenuItem
        onClick={(e) => handleCopyConnectionOnClick(e)}
        className="bg-muted text-xs text-foreground hover:bg-popover"
      >
        Copy Name
      </MenuItem>
      <Separator />
      <MenuItem
        onClick={(e) => handleEditConnectionClick(e)}
        className="bg-muted text-xs text-foreground hover:bg-popover"
      >
        Edit Connection
      </MenuItem>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
        className="bg-muted text-xs text-foreground hover:bg-popover"
      >
        Delete Connection
      </MenuItem>
    </div>
  )
}
export default TreeRootNodeContextMenu
