import React, { useContext, useEffect, useRef, useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { invoke } from "@tauri-apps/api/core"

import { useToast } from "@/components/ui/use-toast"

import {
  getConnectionType,
  getCreateColumnAfterAnotherSql,
  getCreateColumnSql,
  getCreateIndexSql,
  getCreateTableSql,
  getLevelInfos,
  getQueryName,
  getRootNode,
  uuid,
} from "../../lib/jsx-utils.js"
import { clickNode } from "../../lib/node.jsx"
import { SidebarContext } from "../page.jsx"
import QueryPage from "../page/queryPage.jsx"
import TablePage from "../page/tablePage.jsx"

const iconWidth = 20
const iconHeight = 20
const delayDuration = 300
const IconDiv = ({ node }) => {
  const {
    handleAddPageClick,
    setShowQueryLoading,
    setQueryName,
    setBaseConfigId,
    setNodeForUpdate,
    setShowDeleteConnectionDialog,
    setShowEditConnectionDialog,
    setShowRenameQueryDialog,
    setNewQueryName,
    setShowRemoveQueryDialog,
    menulist,
    setMenulist,
    setConnectionType,
  } = useContext(SidebarContext)
  const { toast } = useToast()

  const handleNewQueryClick = (e) => {
    e.stopPropagation()

    console.log("handleNewQueryClick")
    setQueryName(getQueryName())
    setShowQueryLoading(true)
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    setNodeForUpdate(node)
  }
  const handleConnectionRemoveClick = (e) => {
    e.stopPropagation()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    setShowDeleteConnectionDialog(true)
    console.log("handleNewQueryClick")
  }
  const handleQueryRemoveClick = (e) => {
    e.stopPropagation()
    setQueryName(node.data.name)
    let rootNode = getRootNode(node)

    setBaseConfigId(rootNode.data.baseConfigId)
    setShowRemoveQueryDialog(true)
    setNodeForUpdate(node.parent)
    console.log("handleQueryRemoveClick")
  }
  const handleRenameQueryClick = (e) => {
    e.stopPropagation()
    setQueryName(node.data.name)
    setNewQueryName(node.data.name)
    console.log(node)
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    setNodeForUpdate(node.parent)
    setShowRenameQueryDialog(true)
  }
  const handleAddNewDatabaseClick = (e) => {
    e.stopPropagation()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
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
          defaltSql="CREATE DATABASE database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
          queryName={localQueryName}
          firstCreate={true}
        />
      ),
      service: localQueryName,
      tabName: localQueryName,
    })
  }
  const handleAddNewTableClick = (e) => {
    e.stopPropagation()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const createTableSql = getCreateTableSql(node)
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
  const handleAddNewColumnClick = (e) => {
    e.stopPropagation()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const createTableSql = getCreateColumnSql(node, node.parent.data.name)
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

  const handleAddNewIndexClick = (e) => {
    e.stopPropagation()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const createTableSql = getCreateIndexSql(node, node.parent.data.name)
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
  const handleAddNewColumnAfterAnotherClick = (e) => {
    e.stopPropagation()
    let rootNode = getRootNode(node)
    setBaseConfigId(rootNode.data.baseConfigId)
    const localQueryName = getQueryName()
    console.log(localQueryName)
    const createTableSql = getCreateColumnAfterAnotherSql(
      node,
      node.parent.parent.data.name,
      node.data.name
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
  const handleColumnMoveClick = async (e, moveDirection) => {
    e.stopPropagation()
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    const { response_code, response_msg } = JSON.parse(
      await invoke("move_column", {
        listNodeInfoReq: listNodeInfoReq,
        moveDirection: moveDirection,
      })
    )
    if (response_code == 0) {
      console.log("保存成功")
      clickNode(node.parent, menulist, setMenulist)
    } else {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: response_msg,
      })
    }
  }
  return (
    <>
      {node.data.iconName === "mysql" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth - 4}
              height={iconHeight - 4}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={0}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-brand-mysql flex-none fill-slate-50"
            >
              <path
                stroke="none"
                d="M0 0h24v24H0z"
                className={`${
                  node.children && node.children.length
                    ? "fill-lime-500"
                    : "fill-slate-500"
                }`}
              />
              <path d="M13 21c-1.427 -1.026 -3.59 -3.854 -4 -6c-.486 .77 -1.501 2 -2 2c-1.499 -.888 -.574 -3.973 0 -6c-1.596 -1.433 -2.468 -2.458 -2.5 -4c-3.35 -3.44 -.444 -5.27 2.5 -3h1c8.482 .5 6.421 8.07 9 11.5c2.295 .522 3.665 2.254 5 3.5c-2.086 -.2 -2.784 -.344 -3.5 0c.478 1.64 2.123 2.2 3.5 3" />
              <path d="M9 7h.01" />
            </svg>
          )}
          <p className=" flex-none text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div className="absolute right-0 ml-auto flex flex-row  pr-3 group-hover/item:bg-primary-light ">
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Refresh</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    onClick={handleAddNewDatabaseClick}
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>New Database</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-trash  group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                    onClick={handleConnectionRemoveClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 7l16 0" />
                    <path d="M10 11l0 6" />
                    <path d="M14 11l0 6" />
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Remove Connection</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "sqlite" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              width={iconWidth - 4}
              height={iconHeight - 4}
              viewBox="0 0 24 24"
              className="flex-none"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <title>sqlite</title>
              <path
                className={`${
                  node.children && node.children.length
                    ? "fill-lime-500"
                    : "fill-slate-500"
                }`}
                d="M4.884 2.334c-1.265 0.005-2.289 1.029-2.293 2.294v20.754c0.004 1.264 1.028 2.288 2.293 2.292h11.769c-0.056-0.671-0.088-1.452-0.088-2.241 0-0.401 0.008-0.801 0.025-1.198l-0.002 0.057c-0.008-0.077-0.014-0.176-0.020-0.25q-0.229-1.498-0.591-2.972c-0.119-0.504-0.277-0.944-0.478-1.36l0.017 0.039c-0.080-0.126-0.127-0.279-0.127-0.443 0-0.034 0.002-0.068 0.006-0.101l-0 0.004c0.003-0.173 0.020-0.339 0.049-0.501l-0.003 0.019c0.088-0.523 0.19-0.963 0.314-1.394l-0.022 0.088 0.271-0.035c-0.021-0.044-0.018-0.081-0.039-0.121l-0.051-0.476q0.224-0.751 0.477-1.492l0.25-0.024c-0.010-0.020-0.012-0.047-0.023-0.066l-0.054-0.395c1.006-4.731 3.107-8.864 6.029-12.272l-0.031 0.037c0.082-0.086 0.166-0.16 0.247-0.242zM28.094 1.655c-1.29-1.15-2.849-0.687-4.39 0.68q-0.356 0.319-0.684 0.669c-2.8 3.294-4.843 7.319-5.808 11.747l-0.033 0.18c0.261 0.551 0.494 1.201 0.664 1.876l0.016 0.075q0.115 0.436 0.205 0.878s-0.024-0.089-0.12-0.37l-0.062-0.182q-0.019-0.050-0.041-0.1c-0.172-0.4-0.647-1.243-0.857-1.611-0.179 0.529-0.337 1.022-0.47 1.47 0.413 0.863 0.749 1.867 0.959 2.917l0.014 0.083s-0.031-0.124-0.184-0.552c-0.342-0.739-0.664-1.338-1.015-1.919l0.050 0.089c-0.185 0.464-0.292 1.001-0.292 1.564 0 0.1 0.003 0.199 0.010 0.297l-0.001-0.013c0.219 0.426 0.401 0.921 0.519 1.439l0.008 0.043c0.357 1.375 0.606 3.049 0.606 3.049l0.021 0.28c-0.015 0.342-0.023 0.744-0.023 1.147 0 0.805 0.034 1.602 0.101 2.39l-0.007-0.103c0.058 1.206 0.283 2.339 0.651 3.406l-0.026-0.086 0.194-0.105c-0.346-1.193-0.545-2.564-0.545-3.981 0-0.344 0.012-0.684 0.035-1.022l-0.003 0.046c0.221-3.782 0.964-7.319 2.158-10.641l-0.083 0.264c1.655-4.9 4.359-9.073 7.861-12.417l0.012-0.011c-2.491 2.249-5.863 9.535-6.873 12.232-0.963 2.42-1.798 5.294-2.365 8.263l-0.048 0.305c0.664-1.639 1.914-2.926 3.483-3.622l0.042-0.017s1.321-1.63 2.864-3.956c-1.195 0.25-2.184 0.521-3.15 0.843l0.199-0.057c-0.75 0.314-0.952 0.421-0.952 0.421 1.288-0.791 2.777-1.515 4.337-2.092l0.178-0.058c2.867-4.515 5.991-10.929 2.845-13.736z"
              />
            </svg>
          )}
          <p className="flex-none text-sm ">{node.data.name}</p>

          <div className="absolute right-0 ml-auto flex flex-row  pr-3 group-hover/item:bg-primary-light">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Refresh</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-trash  group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                    onClick={handleConnectionRemoveClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 7l16 0" />
                    <path d="M10 11l0 6" />
                    <path d="M14 11l0 6" />
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Delete Connection</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "database" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              className={`${
                node.children && node.children.length > 0
                  ? "fill-emerald-500"
                  : "fill-slate-500"
              } 
              
              flex-none  `}
              viewBox="0 0 16 16"
            >
              <path d="M4.318 2.687C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4c0-.374.356-.875 1.318-1.313M13 5.698V7c0 .374-.356.875-1.318 1.313C10.766 8.729 9.464 9 8 9s-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777A5 5 0 0 0 13 5.698M14 4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13zm-1 4.698V10c0 .374-.356.875-1.318 1.313C10.766 11.729 9.464 12 8 12s-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777A5 5 0 0 0 13 8.698m0 3V13c0 .374-.356.875-1.318 1.313C10.766 14.729 9.464 15 8 15s-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13s3.022-.289 4.096-.777c.324-.147.633-.323.904-.525" />
            </svg>
          )}
          <p className="flex-none text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div className="ml-auto flex flex-row pr-3 ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "query" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
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
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="ml-auto flex flex-row pr-3 group-hover/item:bg-primary-light ">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible group-hover/item:visible group-hover/item:hover:bg-searchMarkerColor "
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Refresh</p>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible  group-hover/item:visible group-hover/item:hover:bg-searchMarkerColor "
                    onClick={handleNewQueryClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Create Query</p>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "singleQuery" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-sql ml-7 flex-none stroke-orange-400"
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
          )}
          <p className="flex-grow text-sm ">{node.data.name}</p>

          <div className="absolute right-0 ml-auto flex flex-row  pr-3 group-hover/item:bg-primary-light">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-pencil group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                    onClick={handleRenameQueryClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Rename</p>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-trash  group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                    onClick={handleQueryRemoveClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 7l16 0" />
                    <path d="M10 11l0 6" />
                    <path d="M14 11l0 6" />
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Delete</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "tables" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-table flex-none stroke-blue-600"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" />
              <path d="M3 10h18" />
              <path d="M10 3v18" />
            </svg>
          )}
          <p className="flex-grow text-sm">{node.data.name}</p>
          <div className="ml-auto flex flex-row pr-3 ">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Refresh</p>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible group-hover/item:hover:bg-searchMarkerColor"
                    onClick={(e) => handleAddNewTableClick(e)}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Create New Table</p>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "views" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-baseline-density-medium stroke-indigo-600"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 20h16" />
              <path d="M4 12h16" />
              <path d="M4 4h16" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="ml-auto flex flex-row ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "functions" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-function stroke-orange-400"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 4m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h10.666a2.667 2.667 0 0 1 2.667 2.667v10.666a2.667 2.667 0 0 1 -2.667 2.667h-10.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
              <path d="M9 15.5v.25c0 .69 .56 1.25 1.25 1.25c.71 0 1.304 -.538 1.374 -1.244l.752 -7.512a1.381 1.381 0 0 1 1.374 -1.244c.69 0 1.25 .56 1.25 1.25v.25" />
              <path d="M9 12h6" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="ml-auto flex flex-row ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "procedures" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-database-cog stroke-indigo-600"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 6c0 1.657 3.582 3 8 3s8 -1.343 8 -3s-3.582 -3 -8 -3s-8 1.343 -8 3" />
              <path d="M4 6v6c0 1.657 3.582 3 8 3c.21 0 .42 -.003 .626 -.01" />
              <path d="M20 11.5v-5.5" />
              <path d="M4 12v6c0 1.657 3.582 3 8 3" />
              <path d="M19.001 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M19.001 15.5v1.5" />
              <path d="M19.001 21v1.5" />
              <path d="M22.032 17.25l-1.299 .75" />
              <path d="M17.27 20l-1.3 .75" />
              <path d="M15.97 17.25l1.3 .75" />
              <path d="M20.733 20l1.3 .75" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="ml-auto flex flex-row ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "singleTable" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-table  flex-none"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" />
              <path d="M3 10h18" />
              <path d="M10 3v18" />
            </svg>
          )}
          <p className="flex-grow text-sm">{node.data.name}</p>

          <div className="absolute right-0 z-50 flex flex-row pr-3 ">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-pencil group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                    onClick={handleRenameQueryClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Edit Table</p>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "columns" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-layout-columns "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
              <path d="M12 4l0 16" />
            </svg>
          )}

          <p className="text-sm">{node.data.name}</p>

          <div className="ml-auto flex flex-row pr-3 ">
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Refresh</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    onClick={handleAddNewColumnClick}
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Add Column</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "index" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-key "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
              <path d="M15 9h.01" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="ml-auto flex flex-row pr-3 ">
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Refresh</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    onClick={handleAddNewIndexClick}
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Create Index</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </>
      ) : node.data.iconName === "singlePrimaryIndex" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-sitemap  ml-3 stroke-yellow-400"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
              <path d="M15 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
              <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
              <path d="M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
              <path d="M12 9l0 3" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="absolute right-0 z-50 flex flex-row pr-3 ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "singleCommonIndex" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-sitemap  ml-3"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
              <path d="M15 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
              <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
              <path d="M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
              <path d="M12 9l0 3" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="absolute right-0 z-50 flex flex-row pr-3 ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "partitions" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-layout-grid "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
              <path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
              <path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
              <path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="absolute right-0 z-50 flex flex-row pr-3 ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
          </div>
        </>
      ) : node.data.iconName === "primary" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-key ml-3 stroke-yellow-400"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
              <path d="M15 9h.01" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="absolute right-0 z-50 flex flex-row pr-3 ">
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    onClick={handleAddNewColumnAfterAnotherClick}
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Add Column</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            {getConnectionType(node) === 0 && (
              <>
                <Tooltip.Provider delayDuration={delayDuration}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={iconWidth}
                        height={iconHeight}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-up group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                        onClick={(e) => handleColumnMoveClick(e, -1)}
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 5l0 14" />
                        <path d="M18 11l-6 -6" />
                        <path d="M6 11l6 -6" />
                      </svg>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                        sideOffset={5}
                      >
                        <p>Move Column Up</p>
                        <Tooltip.Arrow className="fill-muted" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
                <Tooltip.Provider delayDuration={delayDuration}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={iconWidth}
                        height={iconHeight}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-down group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                        onClick={(e) => handleColumnMoveClick(e, 1)}
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 5l0 14" />
                        <path d="M18 13l-6 6" />
                        <path d="M6 13l6 6" />
                      </svg>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                        sideOffset={5}
                      >
                        <p>Move Column Down</p>
                        <Tooltip.Arrow className="fill-muted" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </>
            )}
          </div>
        </>
      ) : node.data.iconName === "column" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-cube ml-3 stroke-red-500"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.718z" />
              <path d="M12 22v-10" />
              <path d="M12 12l8.73 -5.04" />
              <path d="M3.27 6.96l8.73 5.04" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>

          <div className="absolute right-0 z-50 flex flex-row pr-3 ">
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={iconWidth}
                    height={iconHeight}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    onClick={handleAddNewColumnAfterAnotherClick}
                    class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 5l0 14" />
                    <path d="M5 12l14 0" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Add Column</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            {getConnectionType(node) === 0 && (
              <>
                <Tooltip.Provider delayDuration={delayDuration}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={iconWidth}
                        height={iconHeight}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-up group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                        onClick={(e) => handleColumnMoveClick(e, -1)}
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 5l0 14" />
                        <path d="M18 11l-6 -6" />
                        <path d="M6 11l6 -6" />
                      </svg>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                        sideOffset={5}
                      >
                        <p>Move Column Up</p>
                        <Tooltip.Arrow className="fill-muted" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
                <Tooltip.Provider delayDuration={delayDuration}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={iconWidth}
                        height={iconHeight}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-down group/edit invisible  group-hover/item:visible   group-hover/item:hover:bg-searchMarkerColor"
                        onClick={(e) => handleColumnMoveClick(e, 1)}
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 5l0 14" />
                        <path d="M18 13l-6 6" />
                        <path d="M6 13l6 6" />
                      </svg>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                        sideOffset={5}
                      >
                        <p>Move Column Down</p>
                        <Tooltip.Arrow className="fill-muted" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </>
            )}
          </div>
        </>
      ) : node.data.iconName === "" ? (
        <p className="ml-4 p-1 text-xs">{node.data.name}</p>
      ) : null}
    </>
  )
}
export default IconDiv
