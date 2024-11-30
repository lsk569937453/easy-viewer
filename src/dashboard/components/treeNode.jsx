import React, { useContext, useEffect, useRef, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"
import { invoke } from "@tauri-apps/api/core"

import { MainPageDialogContext, SidebarContext } from "../page.jsx"

import "@szhsin/react-menu/dist/index.css"

import { useToast } from "@/components/ui/use-toast"

import {
  formatMap,
  getAlterColumnSql,
  getLevelInfos,
  getQueryName,
  getRootNode,
  uuid,
} from "../../lib/jsx-utils"
import { clickNode } from "../../lib/node.jsx"
import QueryPage from "../page/queryPage.jsx"
import TablePage from "../page/tablePage.jsx"
import DatabaseNodeContextMenu from "./contextMenu/databaseNodeContextMenu.jsx"
import SingleTableNodeContextMenu from "./contextMenu/singleTableNodeContextMenu.jsx"
import TreeRootNodeContextMenu from "./contextMenu/treeRootNodeContextMenu.jsx"
import IconDiv from "./iconDiv.jsx"

const TreeNode = ({
  node,
  style,
  dragHandle,
  toggleRowSelection,
  selectedRows,
}) => {
  const { toast } = useToast()
  const [isOpen, setOpen] = useState(false)
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 })
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
  const handleClickIcon = async (e) => {
    console.log(e)
    if (e.button !== 0) {
      return
    }
    toggleRowSelection(node)
    addTab()
    if (!node.data.showFirstIcon) return
    if (node.children && node.children.length > 0) {
      node.isInternal && node.toggle()
    } else {
      const { response_code, response_msg } = await clickNode(
        node,
        menulist,
        setMenulist
      )
      console.log(response_code)
      console.log(response_msg)
      if (response_code !== 0) {
        toast({
          variant: "destructive",
          title: "操作信息",
          description: response_msg,
        })

        return
      }
    }
  }
  const addTab = async () => {
    if (node.data.iconName === "singleTable") {
      handleAddPageClick({
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-border-all"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
            <path d="M4 12l16 0" />
            <path d="M12 4l0 16" />
          </svg>
        ),
        render: () => <TablePage node={node} />,
        service: `sourceTable${node.data.name}`,
        tabName: node.data.name,
      })
    } else if (node.data.iconName === "singleQuery") {
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

        render: (tabIndex, queryName) => (
          <QueryPage
            node={node}
            tabIndex={tabIndex}
            queryName={queryName}
            firstCreate={false}
          />
        ),
        service: node.data.name,
        tabName: node.data.name,
      })
    } else if (
      node.data.iconName === "column" ||
      node.data.iconName === "primary"
    ) {
      const localQueryName = getQueryName()
      console.log(localQueryName)
      const createTableSql = getAlterColumnSql(
        node,
        node.parent.parent.data.name,
        node.data.name,
        node.data.description
      )
      if (createTableSql == null) {
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

        render: (tabIndex, queryName) => (
          <QueryPage
            node={node}
            tabIndex={tabIndex}
            queryName={queryName}
            defaltSql={createTableSql}
            firstCreate={false}
          />
        ),
        service: localQueryName,
        tabName: localQueryName,
      })
    } else if (node.data.iconName === "singleProcedure") {
      const localQueryName = getQueryName()
      console.log(localQueryName)

      const listNodeInfoReq = {
        level_infos: getLevelInfos(node),
      }
      const { response_code, response_msg } = JSON.parse(
        await invoke("get_procedure_details", {
          listNodeInfoReq: listNodeInfoReq,
        })
      )
      if (response_code !== 0) {
        toast({
          variant: "destructive",
          title: "Get Procedure Details Error",
          description: response_msg,
        })
        return
      }
      const defaultSql = response_msg
      console.log(defaultSql)
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

        render: (tabIndex, queryName) => (
          <QueryPage
            node={node}
            tabIndex={tabIndex}
            queryName={queryName}
            defaltSql={defaultSql}
            firstCreate={false}
          />
        ),
        service: localQueryName,
        tabName: localQueryName,
      })
    }
  }
  const handleContextMenuClick = (e) => {
    console.log(e)
    e.preventDefault()
    e.stopPropagation()

    const contextMenuArray = ["mysql", "sqlite", "database", "singleTable"]
    if (contextMenuArray.includes(node.data.iconName)) {
      if (typeof document.hasFocus === "function" && !document.hasFocus())
        return

      setAnchorPoint({ x: e.clientX, y: e.clientY })
      setOpen(true)
    }
  }

  return (
    <div
      style={style}
      ref={dragHandle}
      className={`group/item mb-1 flex cursor-pointer flex-row content-center  items-center justify-items-center gap-2 ${
        selectedRows[node.id] ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      }  `}
      onClick={(e) => handleClickIcon(e)}
      onContextMenu={handleContextMenuClick}
    >
      {" "}
      <ControlledMenu
        anchorPoint={anchorPoint}
        state={isOpen ? "open" : "closed"}
        direction="right"
        onClose={() => setOpen(false)}
        className="p-1"
      >
        {(node.data.iconName == "mysql" || node.data.iconName == "sqlite") && (
          <TreeRootNodeContextMenu node={node} />
        )}
        {node.data.iconName == "database" && (
          <DatabaseNodeContextMenu node={node} />
        )}
        {node.data.iconName == "singleTable" && (
          <SingleTableNodeContextMenu node={node} />
        )}
      </ControlledMenu>
      {node.data.showFirstIcon && node.isOpen && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down flex-none"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M6 9l6 6l6 -6" />
        </svg>
      )}
      {node.data.showFirstIcon && !node.isOpen && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right flex-none"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M9 6l6 6l-6 6" />
        </svg>
      )}
      <IconDiv node={node} selectedRows={selectedRows} />
    </div>
  )
}

export default TreeNode
