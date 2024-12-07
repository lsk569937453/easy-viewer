import React, { useContext, useEffect, useRef, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { set } from "date-fns"

import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import { formatMap, getLevelInfos, getRootNode } from "../../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../../page"
import CommonDumpDataPage from "../../page/commonDumpDataPage"
import ImportDataPage from "../../page/importDataPage"
import PostGresqlDumpDataPage from "../../page/postgresqlDumpDataPage"

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
    setShowTruncateDatabaseDialog,
  } = useContext(MainPageDialogContext)

  const handleGenerateDocumentOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (Array.isArray(selected)) {
      return
    } else if (selected === null) {
      return
    } else {
    }

    console.log(selected)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }

    const { response_code, response_msg } = JSON.parse(
      await invoke("generate_database_document", {
        listNodeInfoReq: listNodeInfoReq,
        fileDir: selected,
      })
    )
    if (response_code === 0) {
      toast({
        variant: "default",
        title: "Success",
        description: "Generate document success",
        duration: 1000,
      })
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response_msg,
        duration: 1000,
      })
    }
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
  const handleTruncateDatabaseOnClick = (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    setShowTruncateDatabaseDialog(true)
  }
  const handleDumpStructOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()
    let rootNode = getRootNode(node)
    let base_config_id = rootNode.data.baseConfigId
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
          class="icon icon-tabler icons-tabler-outline icon-tabler-download stroke-cyan-500"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
          <path d="M7 11l5 5l5 -5" />
          <path d="M12 4l0 12" />
        </svg>
      ),
      render: (tabIndex) => {
        return rootNode.data.connectionType === 1 ? (
          <PostGresqlDumpDataPage node={node} />
        ) : (
          <CommonDumpDataPage node={node} />
        )
      },
      service: `dumpDataBaseStruct${node.data.name}${base_config_id}`,
      tabName: node.data.name,
    })
  }
  const handleImportSqlOnClick = async (e) => {
    e.syntheticEvent.stopPropagation()
    e.syntheticEvent.preventDefault()

    handleAddPageClick({
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-upload stroke-cyan-500"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
          <path d="M7 9l5 -5l5 5" />
          <path d="M12 4l0 12" />
        </svg>
      ),
      render: (tabIndex) => <ImportDataPage node={node} />,
      service: `importData${node.data.name}`,
      tabName: node.data.name,
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
        onClick={(e) => handleDropDatabaseOnClick(e)}
        className="text-xs"
      >
        Drop
      </MenuItem>
      <MenuItem
        onClick={(e) => handleTruncateDatabaseOnClick(e)}
        className="text-xs"
      >
        Truncate
      </MenuItem>
      <Separator />
      <MenuItem onClick={(e) => handleDumpStructOnClick(e)} className="text-xs">
        Dump Struct
      </MenuItem>
      <MenuItem onClick={(e) => handleDumpStructOnClick(e)} className="text-xs">
        Dump Struct And Data
      </MenuItem>
      <MenuItem onClick={(e) => handleImportSqlOnClick(e)} className="text-xs">
        Import SQL
      </MenuItem>
      <MenuItem
        onClick={(e) => handleGenerateDocumentOnClick(e)}
        className="text-xs"
      >
        Generate Document
      </MenuItem>
    </>
  )
}
export default DatabaseNodeContextMenu
