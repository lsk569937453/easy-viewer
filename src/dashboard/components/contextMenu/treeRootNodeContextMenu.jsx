import React, { useContext, useEffect, useRef, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"

import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import { formatMap, getRootNode } from "../../../lib/jsx-utils"
import { SidebarContext } from "../../page"

const TreeRootNodeContextMenu = ({ node }) => {
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
    navigator.clipboard.writeText(node.data.name).then(() => {
      toast({
        title: "Copied to clipboard",
      })
    })
  }
  return (
    <>
      <MenuItem
        onClick={(e) => handleCopyConnectionOnClick(e)}
        className="text-xs"
      >
        Copy Name
      </MenuItem>
      <Separator />
      <MenuItem
        onClick={(e) => handleEditConnectionClick(e)}
        className="text-xs"
      >
        Edit Connection
      </MenuItem>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
        className="text-xs"
      >
        Delete Connection
      </MenuItem>
    </>
  )
}
export default TreeRootNodeContextMenu
