import { open } from "@tauri-apps/plugin-dialog"
import AceEditor from "react-ace"

import "ace-builds/src-noconflict/mode-java"
import "ace-builds/src-noconflict/mode-sql"
import "ace-builds/src-noconflict/theme-xcode"

import { useContext, useEffect, useRef, useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { DataTable } from "../../dashboard/components/table"
import { getLevelInfos } from "../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../page.jsx"
import DataPage from "./dataPage"

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

import { invoke } from "@tauri-apps/api/core"
import { sq, ta } from "date-fns/locale"
import { useHotkeys } from "react-hotkeys-hook"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

import { getRootNode } from "../../lib/jsx-utils.js"

const delayDuration = 300

const S3NodeInfoPage = ({ node }) => {
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [size, setSize] = useState("")
  const [contentType, setContentType] = useState("")
  const [lastModified, setLastModified] = useState("")

  const [etag, setEtag] = useState("")
  const {
    setShowDeleteBucketDialog,
    showDeleteBucketDialog,
    setShowCreateFolderDialog,
    showCreateFolderDialog,
    setShowRenameBucketDialog,
    showRenameBucketDialog,
  } = useContext(MainPageDialogContext)
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
    handleRemoveTabButton,
  } = useContext(SidebarContext)
  useEffect(() => {
    loadData()
  }, [node])
  const loadData = async () => {
    var isFolder = true
    if (node.data.iconName !== "folder") {
      isFolder = false
    }
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }

    const { response_code, response_msg } = JSON.parse(
      await invoke("get_object_info", { listNodeInfoReq, isFolder })
    )

    console.log(response_code, response_msg)
    if (response_code === 0) {
      const { name, size, last_modified, etag, content_type } = response_msg
      setName(name)
      setSize(size)
      setLastModified(last_modified)
      setEtag(etag)
      setContentType(content_type)
    }
  }
  const handleDownloadFileOnClick = async () => {
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
    var isFolder = true
    if (node.data.iconName !== "folder") {
      isFolder = false
    }

    console.log(selected)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }

    const { response_code, response_msg } = JSON.parse(
      await invoke("download_file", {
        listNodeInfoReq: listNodeInfoReq,
        destination: selected,
        isFolder: isFolder,
      })
    )
    if (response_code === 0) {
      toast({
        variant: "default",
        title: "Success",
        description: "Download bucket success",
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

  const handleDeleteObjectOnClick = async () => {
    setShowDeleteBucketDialog(true)
    setNodeForUpdate(node)
  }
  return (
    <div className="flex h-full flex-col bg-muted ">
      <Card className="m-4 flex flex-col gap-4 p-10">
        <div className="flex flex-row">
          <div className="basis-9/12 pb-4 text-2xl font-bold">
            Object Details
          </div>
          <div className="flex basis-3/12 flex-row justify-end gap-2">
            <Tooltip.Provider delayDuration={delayDuration}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
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
                    class="icon icon-tabler icons-tabler-outline icon-tabler-download"
                    className="cursor-pointer stroke-blue-400"
                    onClick={handleDownloadFileOnClick}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
                    <path d="M7 11l5 5l5 -5" />
                    <path d="M12 4l0 12" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-muted px-[15px] py-2.5 text-[15px] leading-none text-foreground shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Download</p>
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
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-trash"
                    className="cursor-pointer stroke-red-400"
                    onClick={handleDeleteObjectOnClick}
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
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-muted px-[15px] py-2.5 text-[15px] leading-none text-foreground shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p>Delete</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </div>
        <div className="flex  flex-row justify-start gap-4 text-nowrap">
          <span className="basis-1/6 text-right font-bold">Object Path:</span>
          <span className="basis-1/6">{name}</span>
        </div>
        <div className="flex  flex-row justify-start gap-4 text-nowrap">
          <span className="basis-1/6 text-right font-bold">Size:</span>
          <span className="basis-1/6">{size}</span>
        </div>
        <div className="flex  flex-row  justify-start gap-4 text-nowrap">
          <span className="basis-1/6  text-right font-bold">
            Last Modified:
          </span>
          <span className="basis-1/6">{lastModified}</span>
        </div>
        <div className="flex  flex-row  justify-start gap-4 text-nowrap">
          <span className="basis-1/6  text-right font-bold">Content Type:</span>
          <span className="basis-1/6">{contentType}</span>
        </div>
        <div className="flex  flex-row  justify-start gap-4 text-nowrap">
          <span className="basis-1/6  text-right font-bold">ETag:</span>
          <span className="basis-1/6">{etag}</span>
        </div>
      </Card>
    </div>
  )
}
export default S3NodeInfoPage
