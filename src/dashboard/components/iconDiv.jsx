import React, { useContext, useEffect, useRef, useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { menu } from "@tauri-apps/api"
import { invoke } from "@tauri-apps/api/core"

import { useToast } from "@/components/ui/use-toast"

import {
  getAlterColumnSql,
  getConnectionType,
  getCreateColumnAfterAnotherSql,
  getCreateColumnSql,
  getCreateIndexSql,
  getCreateTableSql,
  getLevelInfos,
  getQueryName,
  getRootNode,
  updateNode,
  uuid,
} from "../../lib/jsx-utils.js"
import { clickNode } from "../../lib/node.jsx"
import { SidebarContext } from "../page.jsx"
import QueryPage from "../page/queryPage.jsx"
import TablePage from "../page/tablePage.jsx"

const iconWidth = 20
const iconHeight = 20
const delayDuration = 300
const secondHoverColor = "bg-primary-light"
const IconDiv = ({ node, selectedRows }) => {
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
  const handleRefreshClick = (e) => {
    console.log("dsadadad")
    console.log(node, menulist)
    e.stopPropagation()
    // let updatedMenuList = [...menulist]
    // updateNode(node, updatedMenuList)
    // console.log(updatedMenuList)
    // setMenulist(updatedMenuList)
    clickNode(node, menulist, setMenulist)
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
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
                    onClick={handleRefreshClick}
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
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
                    width={iconWidth - 4}
                    height={iconHeight - 4}
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
      ) : node.data.iconName === "postgresql" ? (
        <>
          {node.data.showSecondIcon && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              id="Postgresql--Streamline-Svg-Logos"
              width={iconWidth}
              height={iconHeight}
              viewBox="0 0 24 24"
            >
              <path
                fill="#000000"
                d="M22.36419375 13.730017708333333c-0.1312916666666667 -0.39756458333333333 -0.4752135416666667 -0.6745468750000001 -0.9200239583333334 -0.74103125 -0.20970729166666666 -0.031313541666666674 -0.44991354166666664 -0.017944791666666664 -0.7341072916666667 0.040657291666666664 -0.49538645833333333 0.10220625 -0.86293125 0.141090625 -1.1311447916666668 0.14866145833333336 1.0124072916666667 -1.709379166666667 1.8356635416666667 -3.6587489583333337 2.309607291666667 -5.49369375 0.76633125 -2.9670239583333333 0.3568114583333334 -4.31868125 -0.12170833333333334 -4.930121875C20.500355208333332 1.1362646875000002 18.652592708333334 0.2668742708333333 16.423341666666666 0.2402254166666667c-1.1891 -0.014513958333333334 -2.2331083333333335 0.22028010416666666 -2.7776333333333336 0.3890809375 -0.5070541666666667 -0.08940770833333334 -1.0522979166666666 -0.13937041666666666 -1.6243989583333334 -0.148623125 -1.0722072916666667 -0.017091875 -2.0196875 0.2166384375 -2.829263541666667 0.6970485416666666 -0.448284375 -0.15150531250000002 -1.1675375 -0.3651609375 -1.9982447916666668 -0.5015485416666667 -1.9538020833333332 -0.3207613541666667 -3.5284395833333333 -0.070796875 -4.680188541666667 0.7428664583333333C1.1188948958333333 2.4042427083333333 0.47231458333333337 4.115921875000001 0.5919121875000001 6.506580208333334c0.03792604166666667 0.7590479166666667 0.46255875 3.068415625 1.1310848958333333 5.258614583333334 0.3842269791666667 1.2588427083333333 0.793945625 2.3042645833333335 1.2177685416666668 3.107395833333334 0.60101875 1.1388833333333332 1.2441083333333334 1.8095729166666668 1.9660927083333335 2.050402083333333 0.4047041666666667 0.13486145833333332 1.1399375 0.22923333333333334 1.9132885416666667 -0.41471875 0.09801354166666668 0.11861770833333334 0.22873020833333335 0.2366125 0.4023322916666667 0.3461260416666667 0.22036875 0.13903020833333335 0.4899239583333334 0.25261666666666666 0.7590479166666667 0.319915625 0.9700729166666668 0.24253020833333333 1.8786927083333333 0.18184375 2.653888541666667 -0.15802916666666667 0.004743750000000001 0.13785625 0.008433333333333334 0.26957916666666665 0.011571875 0.38330937500000006 0.005151041666666667 0.18452708333333334 0.01020625 0.3654125 0.016986458333333336 0.5345822916666667 0.04592812500000001 1.1439625 0.12374479166666666 2.033439583333333 0.35434375 2.6557572916666667 0.01265 0.034284375000000006 0.029684375 0.08641770833333334 0.047677083333333335 0.14168958333333334 0.115 0.352259375 0.30743333333333334 0.9418979166666667 0.7967822916666667 1.4037427083333334 0.5068625000000001 0.47835208333333334 1.1198604166666666 0.6250968750000001 1.6812760416666668 0.6250489583333334 0.2815822916666667 0 0.5502510416666667 -0.03691979166666667 0.7858572916666667 -0.08742395833333334 0.8400031250000001 -0.17999895833333332 1.7939520833333333 -0.45427395833333334 2.4840239583333337 -1.4368291666666668 0.6523854166666666 -0.9289125 0.9695697916666667 -2.327983333333333 1.0269739583333335 -4.532509375 0.007427083333333333 -0.06229166666666667 0.014303125000000002 -0.12180416666666666 0.020915625 -0.17856145833333334 0.00445625 -0.03826145833333334 0.009008333333333333 -0.077409375 0.013608333333333335 -0.11646145833333334l0.15374062500000002 0.0135125 0.03957916666666667 0.0026833333333333336c0.8555520833333334 0.038980208333333335 1.9016208333333333 -0.14245625 2.544063541666667 -0.4408572916666667 0.507653125 -0.23560625000000002 2.1343760416666666 -1.0943927083333334 1.7513781250000002 -2.2539520833333335Z"
                stroke-width="1"
              ></path>
              <path
                className={`${
                  node.children && node.children.length
                    ? "fill-lime-500"
                    : "fill-slate-500"
                }`}
                d="M20.901345833333334 13.9555375c-2.5437520833333336 0.5247114583333334 -2.7186239583333336 -0.33651875000000003 -2.7186239583333336 -0.33651875000000003C20.868522916666667 9.633741666666667 21.99125833333333 4.575011458333334 21.022359375000004 3.336916666666667 18.379084375 -0.04035805208333333 13.803473958333333 1.5568771875 13.72711875 1.5983442708333335l-0.02458125 0.004401145833333333c-0.5025739583333334 -0.10432416666666666 -1.0649958333333334 -0.16647447916666666 -1.6971125 -0.1767909375 -1.15100625 -0.018862395833333333 -2.0240958333333334 0.30174802083333335 -2.686615625 0.8041542708333334 0 0 -8.162458020833334 -3.362614375 -7.782833437500001 4.229129791666667 0.08075875 1.6150791666666668 2.3148709375000003 12.220451041666667 4.979612604166666 9.017126041666666 0.9739781249999999 -1.1713229166666668 1.9150375 -2.1617364583333334 1.9150375 -2.1617364583333334 0.46740312500000003 0.3105 1.0269500000000003 0.4688885416666667 1.6135697916666667 0.4119875l0.04554479166666667 -0.03869270833333334c-0.014159375 0.14545104166666667 -0.0076906249999999995 0.2876916666666667 0.01825625 0.45609479166666667 -0.686478125 0.766978125 -0.4847489583333333 0.9016479166666667 -1.8570583333333335 1.184140625 -1.3885770833333333 0.28615833333333335 -0.57284375 0.7956562500000001 -0.04025 0.9287927083333334 0.6456770833333333 0.16147916666666667 2.1394312500000003 0.390209375 3.1487479166666668 -1.022709375l-0.04025 0.16121562500000003c0.26898020833333336 0.21543333333333334 0.45786770833333335 1.4013229166666668 0.4261947916666667 2.4763333333333337 -0.03164895833333333 1.0750583333333332 -0.052780208333333335 1.8131187500000001 0.15915520833333335 2.389604166666667 0.21193541666666668 0.576509375 0.4231520833333334 1.8736135416666666 2.2271666666666667 1.4870458333333334 1.507434375 -0.32303020833333335 2.288571875 -1.1601583333333332 2.397246875 -2.556521875 0.077121875 -0.9927375 0.251634375 -0.8459927083333334 0.26265520833333333 -1.7335291666666668l0.1399885416666667 -0.42018125c0.16140729166666667 -1.3456916666666665 0.025635416666666667 -1.779840625 0.95435625 -1.5779197916666667l0.22568749999999999 0.019813541666666667c0.68353125 0.031121874999999997 1.5781593750000003 -0.10992083333333333 2.1032302083333336 -0.353984375 1.1306177083333333 -0.5246875 1.8011875 -1.400771875 0.6863822916666666 -1.1705802083333334h0.00009583333333333334Z"
                stroke-width="1"
              ></path>
              <path
                fill="#ffffff"
                d="M9.796682291666668 7.181534375000001c-0.22918541666666667 -0.0319125 -0.43680833333333335 -0.0023718750000000003 -0.5418416666666667 0.077121875 -0.05912916666666667 0.044754166666666664 -0.07738541666666668 0.09657604166666667 -0.08227291666666667 0.13229791666666668 -0.013201041666666668 0.094515625 0.05304375000000001 0.19897395833333334 0.09370104166666667 0.25288020833333336 0.11509583333333334 0.15256666666666668 0.28328333333333333 0.25745625 0.4497697916666667 0.28057604166666666 0.024102083333333333 0.0033302083333333335 0.048084375 0.004959375 0.07194687500000001 0.004959375 0.2776291666666667 0 0.5299583333333334 -0.21615208333333336 0.552215625 -0.375690625 0.027815625 -0.1998125 -0.2622479166666667 -0.33299687499999997 -0.54351875 -0.37214479166666664Z"
                stroke-width="1"
              ></path>
              <path
                fill="#ffffff"
                d="M17.390659375000002 7.187835416666667c-0.02185 -0.15661562499999998 -0.30062916666666667 -0.20127395833333334 -0.5651052083333333 -0.164521875 -0.26409270833333337 0.03682395833333334 -0.5202072916666667 0.15601666666666666 -0.49883645833333334 0.31299166666666667 0.017202083333333333 0.12206770833333333 0.23752291666666667 0.33045729166666665 0.49847708333333335 0.330409375 0.021993750000000003 0 0.04425104166666667 -0.0014614583333333335 0.06665208333333333 -0.0046 0.174153125 -0.024126041666666667 0.301946875 -0.13471770833333335 0.36263333333333336 -0.19847083333333335 0.09247916666666667 -0.097103125 0.14593020833333334 -0.20541875 0.13617916666666668 -0.2758083333333333Z"
                stroke-width="1"
              ></path>
              <path
                fill="#ffffff"
                d="M21.747817708333333 13.896096875000001c-0.09698333333333334 -0.293321875 -0.40913645833333334 -0.38771770833333336 -0.927834375 -0.28057604166666666 -1.5400416666666668 0.31783125 -2.0915625 0.09765416666666668 -2.2726875000000004 -0.03569791666666667 1.197078125 -1.8236364583333333 2.1818135416666666 -4.027898958333334 2.713041666666667 -6.084602083333333 0.25168229166666667 -0.9742177083333334 0.39068854166666667 -1.87895625 0.4020208333333333 -2.616369791666667 0.012554166666666668 -0.8095281249999999 -0.1252541666666667 -1.4042697916666667 -0.40961562500000004 -1.7675979166666667 -1.1463583333333334 -1.4648029166666667 -2.8287364583333336 -2.2504996875 -4.8653385416666675 -2.2720933333333333 -1.4000531250000001 -0.01572625 -2.582971875 0.3426089583333334 -2.8123010416666667 0.44334416666666665 -0.48295208333333334 -0.12010312499999999 -1.0094364583333335 -0.19383489583333335 -1.5825197916666667 -0.2032385416666667 -1.0511000000000001 -0.01699125 -1.9595760416666668 0.23464072916666667 -2.7117958333333334 0.7475167708333333 -0.32671979166666665 -0.12156937500000001 -1.1711312500000002 -0.41143406250000003 -2.2037114583333333 -0.5777552083333334 -1.785303125 -0.28748802083333336 -3.203923958333333 -0.06968520833333333 -4.2163312500000005 0.6475410416666667C1.6527392708333335 2.7524052083333337 1.0950587500000002 4.282240625 1.2031276041666668 6.443473958333334c0.03635916666666667 0.7271833333333334 0.45062270833333334 2.964029166666667 1.1044863541666667 5.106239583333333C3.16825 14.369226041666668 4.1037510416666665 15.965402083333334 5.088127083333334 16.293679166666667c0.11519166666666668 0.038453125000000005 0.2480885416666667 0.065334375 0.3945458333333334 0.065334375 0.3590875 0 0.7992979166666666 -0.1618625 1.2573572916666667 -0.7125208333333334 0.7608208333333334 -0.9153041666666667 1.4711614583333334 -1.6822822916666667 1.7330020833333333 -1.9609656250000003 0.386975 0.20774270833333333 0.8119958333333334 0.32367708333333334 1.2468395833333334 0.33532083333333335 0.0007666666666666667 0.011380208333333334 0.001940625 0.02276041666666667 0.0029468750000000003 0.03409270833333334 -0.08723229166666667 0.10345208333333335 -0.15879583333333333 0.19413437500000003 -0.2197697916666667 0.27154375000000003 -0.30125208333333336 0.38239895833333337 -0.36395104166666664 0.4620125 -1.3336885416666666 0.6617052083333334 -0.275784375 0.056901041666666666 -1.0085020833333334 0.20788645833333336 -1.0191635416666667 0.7214333333333334 -0.011691666666666668 0.56105625 0.86595 0.7967104166666668 0.9659760416666667 0.8216989583333334 0.34847395833333333 0.08723229166666667 0.6841541666666666 0.13026145833333333 1.004309375 0.13026145833333333 0.7786697916666667 -0.00004791666666666667 1.4638302083333332 -0.25592291666666667 2.0114458333333336 -0.7510697916666667 -0.016890625 2.00028125 0.06655625 3.971333333333334 0.30671458333333335 4.571896875 0.19665 0.4915770833333334 0.6772302083333334 1.6931114583333335 2.1951583333333335 1.693015625 0.22266875 0 0.4678822916666667 -0.025898958333333336 0.7375572916666667 -0.08368645833333334 1.5841489583333335 -0.33968125 2.2720406250000003 -1.039815625 2.5381937500000005 -2.5834031250000002 0.142384375 -0.8249333333333334 0.3868072916666667 -2.7949312500000003 0.5016875 -3.851565625 0.242578125 0.07563645833333334 0.5548989583333334 0.11028020833333334 0.8924958333333334 0.11023229166666668 0.7041354166666667 0 1.5165864583333333 -0.149571875 2.0261322916666664 -0.3860885416666667 0.572340625 -0.26579375 1.6052802083333335 -0.9181552083333334 1.41795 -1.4848177083333334ZM17.975290625 6.755675000000001c-0.005246875 0.31196145833333333 -0.048180208333333335 0.5951729166666667 -0.09370104166666667 0.8907947916666668 -0.048946875 0.31792708333333336 -0.09961875 0.6466354166666667 -0.11236458333333334 1.0456614583333332 -0.012602083333333333 0.388340625 0.035913541666666667 0.7920864583333334 0.08282395833333334 1.1824635416666667 0.09477916666666668 0.7885885416666667 0.19202604166666667 1.6004885416666668 -0.18447916666666667 2.401607291666667 -0.05850625 -0.10393125 -0.11497604166666667 -0.21730208333333334 -0.16677395833333336 -0.34286770833333335 -0.04676666666666667 -0.11341875 -0.14837395833333333 -0.29562187500000003 -0.289009375 -0.5478072916666668 -0.5473520833333334 -0.9815489583333333 -1.8290750000000002 -3.280135416666667 -1.1729520833333336 -4.218104166666667 0.19540416666666668 -0.279234375 0.6913895833333334 -0.56623125 1.93645625 -0.41174791666666666Zm-1.5091354166666668 -5.284801041666666c1.8247385416666666 0.04030510416666667 3.26815625 0.7229403125 4.2901468750000005 2.0288395833333333 0.7838447916666668 1.0016979166666666 -0.079278125 5.559507291666667 -2.5779645833333333 9.491548958333334 -0.024677083333333332 -0.031361458333333335 -0.049809375 -0.06301041666666667 -0.07580416666666667 -0.09549791666666667 -0.010373958333333334 -0.012985416666666666 -0.020939583333333334 -0.026186458333333332 -0.03160104166666666 -0.039531250000000004 0.645653125 -1.0663614583333334 0.5193927083333333 -2.121390625 0.407028125 -3.056819791666667 -0.046167708333333335 -0.38388437500000006 -0.089771875 -0.7464697916666667 -0.07870312500000001 -1.0869895833333334 0.011500000000000002 -0.3610760416666667 0.059225 -0.6706177083333333 0.10534479166666666 -0.9699770833333334 0.05678125 -0.36895833333333333 0.114496875 -0.7506625 0.09856458333333333 -1.200671875 0.011883333333333333 -0.047173958333333335 0.016675 -0.10294895833333334 0.010469791666666667 -0.16914583333333333 -0.040657291666666664 -0.4315614583333333 -0.5333125 -1.7229635416666667 -1.5375260416666667 -2.8919625 -0.5492208333333334 -0.6393041666666667 -1.3502916666666667 -1.3548173958333334 -2.4440135416666666 -1.8374005208333335 0.47044583333333334 -0.0974984375 1.1137989583333334 -0.18842270833333336 1.8340583333333333 -0.17239218750000002ZM6.255329166666667 15.243465624999999c-0.5046343750000001 0.6067208333333334 -0.8531562500000001 0.49047500000000005 -0.9677489583333333 0.45228541666666666 -0.7467572916666666 -0.2490947916666667 -1.6131864583333333 -1.8273260416666668 -2.3770739583333333 -4.330061458333334 -0.6609960416666667 -2.165521875 -1.0472978125 -4.343094791666667 -1.0778398958333333 -4.953720833333334 -0.09653770833333335 -1.9311614583333332 0.37158416666666666 -3.277044791666667 1.3914065625 -4.0002989583333335 1.6596895833333334 -1.1770058333333335 4.388423958333334 -0.47252302083333336 5.484877083333333 -0.11519885416666667 -0.015788541666666666 0.015525 -0.03217604166666667 0.030089270833333338 -0.047796875 0.045865833333333335 -1.7991989583333332 1.8171173958333333 -1.7565291666666667 4.9216621875 -1.7521208333333333 5.1114121875 -0.00014375 0.07321666666666667 0.005965625 0.17688437499999998 0.014398958333333335 0.319484375 0.03095416666666667 0.5221479166666666 0.08855 1.49399375 -0.065334375 2.5945677083333334 -0.14305520833333332 1.0227333333333333 0.17218854166666667 2.0237364583333335 0.8648 2.746391666666667 0.07170729166666667 0.07477395833333333 0.146553125 0.14501979166666665 0.22386666666666669 0.21112083333333334 -0.3083197916666667 0.3301697916666667 -0.9783145833333334 1.060228125 -1.691434375 1.9181520833333334Zm1.9226802083333334 -2.565434375c-0.5582291666666667 -0.5824270833333334 -0.8117322916666667 -1.392578125 -0.6956302083333334 -2.22295 0.16253333333333334 -1.1626260416666665 0.10251770833333333 -2.1751770833333337 0.07029375 -2.719151041666667 -0.004504166666666667 -0.07611562499999999 -0.008481250000000001 -0.142815625 -0.010877083333333334 -0.19545208333333333 0.26287083333333333 -0.23301875000000002 1.4809364583333335 -0.8857395833333334 2.3495697916666667 -0.68669375 0.39646250000000005 0.09082604166666666 0.6379385416666667 0.3607166666666667 0.738371875 0.825053125 0.5197520833333333 2.4037156250000002 0.06880833333333333 3.4055812500000004 -0.2935135416666667 4.210653125 -0.07470208333333334 0.16586354166666667 -0.14523541666666667 0.322646875 -0.20551458333333333 0.48486875l-0.046670833333333335 0.12535000000000002c-0.118234375 0.31701666666666667 -0.22822708333333333 0.6117520833333333 -0.29638854166666667 0.8916572916666666 -0.5933760416666667 -0.0018208333333333334 -1.1706760416666668 -0.2552760416666667 -1.609640625 -0.7133354166666667Zm0.09108958333333333 3.2417541666666665c-0.17326666666666665 -0.04329270833333333 -0.32911562499999997 -0.11849791666666666 -0.42054062500000006 -0.1808375 0.07635520833333333 -0.035961458333333335 0.21229479166666668 -0.0848125 0.447996875 -0.13335208333333334 1.1408 -0.23491145833333335 1.3169177083333332 -0.40060729166666664 1.7016645833333333 -0.8891177083333334 0.08823854166666667 -0.11195729166666667 0.18821666666666667 -0.23893645833333332 0.326671875 -0.39358750000000003l0.00014375 -0.00019166666666666667c0.20628125 -0.23091041666666667 0.3006052083333333 -0.1917625 0.4716677083333333 -0.120821875 0.13867083333333333 0.05740416666666667 0.2736760416666667 0.23115 0.3284447916666667 0.422409375 0.025898958333333336 0.09032291666666667 0.05503229166666666 0.26179270833333335 -0.04020208333333333 0.39514479166666666 -0.8036822916666666 1.125275 -1.9747895833333333 1.110828125 -2.815846875 0.9003541666666667Zm5.970129166666667 5.5556020833333335c-1.3955729166666668 0.29902395833333334 -1.8896895833333336 -0.4130416666666667 -2.2153072916666665 -1.2270739583333332 -0.2101625 -0.5255500000000001 -0.31342291666666666 -2.895388541666667 -0.24015833333333333 -5.512405208333333 0.0009822916666666667 -0.034859375 -0.003977083333333333 -0.06847291666666667 -0.013584375000000001 -0.10009791666666668 -0.008361458333333334 -0.061021874999999996 -0.021203125 -0.1227625 -0.039004166666666666 -0.184934375 -0.10901041666666668 -0.3807697916666667 -0.3745645833333333 -0.6993197916666667 -0.6931385416666667 -0.8313541666666667 -0.12659583333333332 -0.05244479166666667 -0.35894375 -0.14866145833333336 -0.6381541666666667 -0.077265625 0.059584375 -0.24530937500000002 0.16284479166666666 -0.5222916666666667 0.2747541666666667 -0.82225l0.04698229166666667 -0.12623645833333336c0.0529 -0.142240625 0.11919270833333334 -0.28960833333333336 0.18936666666666668 -0.445553125 0.37918854166666666 -0.8423989583333333 0.8984854166666667 -1.9961364583333334 0.33488958333333335 -4.602635416666667 -0.21114479166666666 -0.9762541666666666 -0.9160708333333334 -1.452953125 -1.9847562500000002 -1.342265625 -0.6407177083333334 0.06629270833333334 -1.2268104166666667 0.32480312499999997 -1.51915 0.47303333333333336 -0.06286666666666667 0.031840625 -0.12036666666666666 0.062603125 -0.17405729166666667 0.092575 0.08155416666666666 -0.9836572916666666 0.3898739583333333 -2.8219083333333335 1.5430604166666666 -3.984965625 0.7260333333333334 -0.7322433333333334 1.693015625 -1.093865625 2.871190625 -1.0743970833333334 2.3213947916666666 0.0380290625 3.8099979166666667 1.229335625 4.650120833333333 2.222073125 0.7239010416666667 0.8554802083333334 1.1159072916666668 1.7171895833333333 1.2723552083333334 2.1819093750000005 -1.1764979166666667 -0.11957604166666667 -1.9766583333333336 0.11267604166666667 -2.3823208333333334 0.6925635416666667 -0.8824333333333333 1.26140625 0.482784375 3.709780208333333 1.13893125 4.886421875 0.12029479166666666 0.2156729166666667 0.224178125 0.4020208333333333 0.25683333333333336 0.48122708333333336 0.21366041666666669 0.5178114583333334 0.4902833333333334 0.86350625 0.6922520833333334 1.1159072916666668 0.06190833333333334 0.07731354166666667 0.12197187500000001 0.152303125 0.16763645833333335 0.21780520833333333 -0.35630833333333334 0.10275729166666667 -0.9963552083333332 0.34006458333333334 -0.9380645833333333 1.5264812500000002 -0.04703020833333334 0.5953645833333333 -0.38158437500000003 3.3825333333333334 -0.551496875 4.367292708333333 -0.22434583333333336 1.3009375 -0.7030812500000001 1.7855427083333335 -2.0491802083333335 2.0741447916666664Zm5.82518125 -6.666214583333334c-0.364334375 0.16914583333333333 -0.9740979166666668 0.2960291666666667 -1.5533864583333334 0.32324583333333334 -0.6398072916666667 0.029971875 -0.9654729166666667 -0.071659375 -1.0420916666666666 -0.13416666666666668 -0.035985416666666666 -0.7393302083333334 0.2392479166666667 -0.8165958333333333 0.5304854166666667 -0.898365625 0.04576041666666667 -0.012889583333333334 0.09041875 -0.025395833333333333 0.13349583333333334 -0.040465625 0.026809375 0.021802083333333333 0.05613437500000001 0.04343645833333333 0.08823854166666667 0.06463958333333333 0.5142416666666667 0.33941770833333335 1.4314864583333333 0.37602604166666664 2.7263145833333335 0.10877083333333334 0.004743750000000001 -0.00100625 0.009511458333333334 -0.0019166666666666668 0.014207291666666667 -0.0028750000000000004 -0.17460833333333334 0.16327604166666668 -0.47348854166666665 0.382446875 -0.8972635416666667 0.5792166666666667Z"
                stroke-width="1"
              ></path>
            </svg>
          )}
          <p className="flex-none text-sm ">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
                    onClick={handleRefreshClick}
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
          </div>
        </>
      ) : node.data.iconName === "public" ? (
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-square-toggle-horizontal"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M22 12h-20" />
              <path d="M4 14v-8a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v8" />
              <path d="M18 20a2 2 0 0 0 2 -2" />
              <path d="M4 18a2 2 0 0 0 2 2" />
              <path d="M14 20l-4 0" />
            </svg>
          )}
          <p className="flex-none text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
                    onClick={handleRefreshClick}
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

          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-sql ml-6 flex-none stroke-orange-400"
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

          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
          <p className="flex-none text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
            {" "}
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
                    onClick={handleRefreshClick}
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

          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
            {" "}
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

          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
            {" "}
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
      ) : node.data.iconName === "singleFunction" ? (
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-function ml-6"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 4m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h10.666a2.667 2.667 0 0 1 2.667 2.667v10.666a2.667 2.667 0 0 1 -2.667 2.667h-10.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
              <path d="M9 15.5v.25c0 .69 .56 1.25 1.25 1.25c.71 0 1.304 -.538 1.374 -1.244l.752 -7.512a1.381 1.381 0 0 1 1.374 -1.244c.69 0 1.25 .56 1.25 1.25v.25" />
              <path d="M9 12h6" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>
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
      ) : node.data.iconName === "singleProcedure" ? (
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-database-cog ml-6 stroke-indigo-600"
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
          <p className="flex-none text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
            {" "}
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

          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
                    onClick={(e) => handleRefreshClick(e)}
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

          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
            {" "}
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-sitemap  ml-6 stroke-yellow-400"
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-sitemap  ml-6"
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-key ml-6 stroke-yellow-400"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
              <path d="M15 9h.01" />
            </svg>
          )}
          <p className="text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
            {" "}
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-cube ml-6 flex-none stroke-red-500"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.718z" />
              <path d="M12 22v-10" />
              <path d="M12 12l8.73 -5.04" />
              <path d="M3.27 6.96l8.73 5.04" />
            </svg>
          )}
          <p className="flex-none text-sm">{node.data.name}</p>
          <p className="flex-none text-xs text-muted-foreground">
            {node.data.description}
          </p>
          <div
            className={`absolute right-0 ml-auto flex flex-row  pr-3 ${
              selectedRows[node.id]
                ? "group-hover/item:bg-primary-selected"
                : "group-hover/item:bg-primary-light"
            }`}
          >
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
