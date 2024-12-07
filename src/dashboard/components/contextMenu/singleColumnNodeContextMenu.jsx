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

const SingleColumnNodeContextMenu = ({ node }) => {
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

  const { setShowDropColumnDialog } = useContext(MainPageDialogContext)

  const handleCopyConnectionOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    navigator.clipboard.writeText(node.data.name).then(() => {
      toast({
        title: "Copied to clipboard",
      })
    })
  }
  const handleAddColumnOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const createTableSql = getCreateColumnSql(
      node,
      node.parent.parent.data.name
    )
    handleAddPageClick({
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-sql stroke-orange-400"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M5 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75" />
          <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" />
          <path d="M18 15v6h2" />
          <path d="M13 15a2 2 0 0 1 2 2v2a2 2 0 1 1 -4 0v-2a2 2 0 0 1 2 -2z" />
          <path d="M14 20l1.5 1.5" />
        </svg>
      ),
      render: (tabIndex) => (
        <QueryPage
          node={node}
          tabIndex={tabIndex}
          defaltSql={createTableSql}
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
    })
  }
  const handleCreateIndexOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const createTableSql = getCreateIndexForColumn(
      node,
      node.parent.parent.data.name
    )
    handleAddPageClick({
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-sql stroke-orange-400"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M5 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75" />
          <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" />
          <path d="M18 15v6h2" />
          <path d="M13 15a2 2 0 0 1 2 2v2a2 2 0 1 1 -4 0v-2a2 2 0 0 1 2 -2z" />
          <path d="M14 20l1.5 1.5" />
        </svg>
      ),
      render: (tabIndex) => (
        <QueryPage
          node={node}
          tabIndex={tabIndex}
          defaltSql={createTableSql}
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
    })
  }
  const handleDropColumnOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    setShowDropColumnDialog(true)
    setNodeForUpdate(node)
  }
  const getRootNodeType = (e) => {
    const rootNode = getRootNode(node)
    return rootNode.data.connectionType
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
      <MenuItem onClick={(e) => handleAddColumnOnClick(e)} className="text-xs">
        Add Column
      </MenuItem>

      <Separator />

      <MenuItem
        onClick={(e) => handleCreateIndexOnClick(e)}
        className="text-xs"
      >
        Create Index
      </MenuItem>

      {getRootNodeType() !== 3 && (
        <MenuItem
          onClick={(e) => handleDropColumnOnClick(e)}
          className="text-xs"
        >
          Drop Column
        </MenuItem>
      )}
    </>
  )
}
export default SingleColumnNodeContextMenu
