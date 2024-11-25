import React, { useContext, useEffect, useRef, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"

import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import { formatMap, getRootNode } from "../../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../../page"

const DatabaseNodeContextMenu = ({ node }) => {
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
  const {
    setShowDeleteConnectionDialog,
    setShowEditConnectionDialog,
    setShowDropDatabaseDialog,
  } = useContext(MainPageDialogContext)
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
    e.syntheticEvent.preventDefault()
    navigator.clipboard.writeText(node.data.name).then(() => {
      toast({
        title: "Copied to clipboard",
      })
    })
  }
  const handleDropDatabaseOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    setShowDropDatabaseDialog(true)
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
        onClick={(e) => handleDropDatabaseOnClick(e)}
        className="text-xs"
      >
        Drop
      </MenuItem>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
        className="text-xs"
      >
        Truncate
      </MenuItem>
      <Separator />
      <MenuItem
        onClick={(e) => handleEditConnectionClick(e)}
        className="text-xs"
      >
        Dump Struct
      </MenuItem>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
        className="text-xs"
      >
        Dump Struct And Data
      </MenuItem>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
        className="text-xs"
      >
        Import SQL
      </MenuItem>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
        className="text-xs"
      >
        Generate Document
      </MenuItem>
    </>
  )
}
export default DatabaseNodeContextMenu
