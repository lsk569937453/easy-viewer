import React, { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

import { clickNode } from "../../lib/node.jsx"
import { getLevelInfos, uuid } from "../../lib/utils"
import QueryPage from "../page/queryPage.jsx"
import TablePage from "../page/tablePage.jsx"
import IconDiv from "./iconDiv.jsx"

const TreeNode = ({
  node,
  style,
  dragHandle,
  handleAddPageClick,
  setCurrentMenuList,
  currentMenuList,
  setShowQueryLoading,
  setQueryName,
  setBaseConfigId,
  setNodeForUpdate,
  setShowDeleteConnectionDialog,
}) => {
  const handleClickIcon = (node) => {
    addTab()
    if (!node.data.showFirstIcon) return
    if (node.children && node.children.length > 0) {
      node.isInternal && node.toggle()
    } else {
      clickNode(node, currentMenuList, setCurrentMenuList)
    }
  }
  const addTab = () => {
    console.log(node.data.iconName === "singleTable")
    if (node.data.iconName === "singleTable") {
      handleAddPageClick({
        type: "table",
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
        render: <TablePage node={node} />,
        service: node.data.name,
      })
    }
    console.log(node.data.iconName === "singleQuery")

    if (node.data.iconName === "singleQuery") {
      handleAddPageClick({
        type: "query",
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
        render: <QueryPage />,
        service: node.data.name,
      })
    }
  }
  return (
    <div
      style={style}
      ref={dragHandle}
      className="group/item mt-1 flex cursor-pointer flex-row content-center items-center  justify-items-center gap-2 hover:bg-slate-200"
      onClick={() => handleClickIcon(node)}
    >
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
      <IconDiv
        node={node}
        setShowQueryLoading={setShowQueryLoading}
        setQueryName={setQueryName}
        setBaseConfigId={setBaseConfigId}
        setNodeForUpdate={setNodeForUpdate}
        setShowDeleteConnectionDialog={setShowDeleteConnectionDialog}
      />
    </div>
  )
}

export default TreeNode
