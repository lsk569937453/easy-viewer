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
  getLevelInfos,
  getQueryName,
  getRootNode,
} from "../../../lib/jsx-utils"
import { SidebarContext } from "../../page"
import PropertiesPage from "../../page/propertiesPage"
import QueryPage from "../../page/queryPage"

const SingleTableNodeContextMenu = ({ node }) => {
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
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    navigator.clipboard.writeText(node.data.name).then(() => {
      toast({
        title: "Copied to clipboard",
      })
    })
  }
  const handleEditTableOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
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
          class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-sql stroke-emerald-400"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      ),
      render: (tabIndex) => (
        <PropertiesPage node={node} className="pl-4 pr-4 pt-4" />
      ),
      service: `editTable${node.data.name}`,
      tabName: node.data.name,
    })
  }
  const handleShowDDLOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("get_ddl", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Get DDL Error",
        description: response_msg,
      })
      return
    }
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
          defaltSql={response_msg}
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
    })
  }
  const handleSelectOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("show_columns", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Get Columns Error",
        description: response_msg,
      })
      return
    }
    const { rows } = response_msg
    const columnNames = rows.map((row) => row[0])

    const sql = `select ${columnNames.join(", ")} from ${node.data.name}`
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
          defaltSql={sql}
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
    })
  }
  const handleInsertOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("show_columns", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Get Columns Error",
        description: response_msg,
      })
      return
    }
    const { rows } = response_msg
    const columnNames = rows.map((row) => row[0])

    const placeholders = columnNames.map((col) => `$${col}`)

    const sql = `
    insert into 
      ${node.data.name} (
        ${columnNames.join(",\n    ")}
      )
    values
      (
        ${placeholders.join(",\n    ")}
      )`
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
          defaltSql={sql}
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
    })
  }
  const handleUpdateOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("show_columns", { listNodeInfoReq: listNodeInfoReq })
    )
    console.log(response_code, response_msg)
    if (response_code !== 0) {
      toast({
        variant: "destructive",
        title: "Get Columns Error",
        description: response_msg,
      })
      return
    }
    const { rows } = response_msg

    const setClause = rows
      .map((row) => `${row[0]} = ${row[0]}`)
      .join(",\n      ")

    const sql = `update ${node.data.name} set\n      ${setClause}\nwhere\n      ;`
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
          defaltSql={sql}
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
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
      <MenuItem onClick={(e) => handleEditTableOnClick(e)} className="text-xs">
        Edit Table
      </MenuItem>
      <MenuItem onClick={(e) => handleShowDDLOnClick(e)} className="text-xs">
        Show Table DDL
      </MenuItem>
      <Separator />
      <SubMenu label={<>SQL Template</>} className="text-xs">
        <MenuItem onClick={(e) => handleSelectOnClick(e)}>SELECT</MenuItem>
        <MenuItem onClick={(e) => handleInsertOnClick(e)}>INSERT</MenuItem>
        <MenuItem onClick={(e) => handleUpdateOnClick(e)}>UPDATE</MenuItem>
        <MenuItem>DELETE</MenuItem>
      </SubMenu>
      <MenuItem
        onClick={(e) => handleDeleteConnectionClick(e)}
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
        Generate Mock Data
      </MenuItem>
      <Separator />
      <MenuItem
        onClick={(e) => handleEditConnectionClick(e)}
        className="text-xs"
      >
        Drop
      </MenuItem>
      <MenuItem
        onClick={(e) => handleEditConnectionClick(e)}
        className="text-xs"
      >
        Copy Table
      </MenuItem>
      <MenuItem
        onClick={(e) => handleEditConnectionClick(e)}
        className="text-xs"
      >
        Truncate Table
      </MenuItem>
    </>
  )
}
export default SingleTableNodeContextMenu
