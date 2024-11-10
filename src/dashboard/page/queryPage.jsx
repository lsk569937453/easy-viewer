import AceEditor from "react-ace"

import "ace-builds/src-noconflict/mode-java"
import "ace-builds/src-noconflict/mode-sql"

import { useContext, useEffect, useRef, useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { DataTable } from "../../dashboard/components/table"
import { SidebarContext } from "../page.jsx"
import DataPage from "./dataPage"

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

import { invoke } from "@tauri-apps/api/core"
import { sq, ta } from "date-fns/locale"
import { useHotkeys } from "react-hotkeys-hook"

import { getRootNode } from "../../lib/jsx-utils.js"

const QueryPage = ({
  node,
  tabIndex,
  defaltSql = "",
  queryName,
  firstCreate = true,
}) => {
  const [sqlOfQuqery, setSqlOfQuery] = useState(defaltSql)
  const [currentQueryName, setCurrentQueryName] = useState(queryName)
  const textAreaRef = useRef(null)
  const { event, setShowSaveQueryDialog, handleRemoveButton, setTabsState } =
    useContext(SidebarContext)
  const [clickFlag, setClickFlag] = useState(false)
  const hasMounted = useRef(false)

  useEffect(() => {
    setCurrentQueryName(queryName)
  }, [queryName])
  useEffect(() => {
    if (!firstCreate) {
      loadQuery()
    }
  }, [firstCreate])

  useEffect(() => {
    if (hasMounted.current) {
      const { type, index } = event
      if (index == tabIndex) {
        //save the query
        if (type == 0) {
          const saveSync = async () => {
            await handleOnSave()
            setShowSaveQueryDialog(false)
            handleRemoveButton(index)
          }
          saveSync()
        } else {
          setTabsState((prevTabsState) =>
            prevTabsState.filter((tab) => tab !== tabIndex)
          )
          setShowSaveQueryDialog(false)
          handleRemoveButton(index)
        }
      }
    } else {
      hasMounted.current = true
    }
  }, [event])
  useHotkeys("ctrl+s", () => handleOnSave(), {})
  const handleEditorLoad = (editor) => {
    // Add the custom save command
    editor.commands.addCommand({
      name: "save",
      bindKey: { win: "Ctrl-S", mac: "Cmd-S" },
      exec: (editor) => handleOnEditorSave(editor),
    })
  }
  const handleOnEditorSave = async (editor) => {
    let baseConfigId = getRootNode(node).data.baseConfigId
    await invoke("save_query", {
      connectionId: baseConfigId,
      queryName: currentQueryName,
      sql: editor.getValue(),
    })
    setTabsState((prevTabsState) =>
      prevTabsState.filter((tab) => tab !== tabIndex)
    )
  }
  const loadQuery = async () => {
    let baseConfigId = getRootNode(node).data.baseConfigId

    const { response_code, response_msg } = JSON.parse(
      await invoke("get_query", {
        connectionId: baseConfigId,
        queryName: currentQueryName,
      })
    )
    if (response_code == 0) {
      setSqlOfQuery(response_msg)
    }
  }
  const handleOnSave = async () => {
    console.log("ctrl+s", sqlOfQuqery, node)
    let baseConfigId = getRootNode(node).data.baseConfigId
    await invoke("save_query", {
      connectionId: baseConfigId,
      queryName: currentQueryName,
      sql: sqlOfQuqery,
    })
    setTabsState((prevTabsState) =>
      prevTabsState.filter((tab) => tab !== tabIndex)
    )
  }
  const handleOnChange = (sql) => {
    console.log(sql)
    setSqlOfQuery(sql)
    setTabsState((prevState) => {
      // Check if tabIndex is already in the array
      if (!prevState.includes(tabIndex)) {
        return [...prevState, tabIndex]
      }
      return prevState
    })
  }

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel defaultSize={50} className="min-h-[200px]">
        <div className="flex h-full flex-col items-start justify-start">
          <div
            className="flex cursor-pointer flex-row items-start p-2 text-muted"
            onClick={() => setClickFlag(!clickFlag)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A.998.998 0 0 0 5 3v18a1 1 0 0 0 .536.886zM7 4.909 17.243 12 7 19.091V4.909z" />
            </svg>
            <span className="select-none"> Run</span>
          </div>
          <AceEditor
            className=" resize-y	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
            mode="sql"
            width="100%"
            ref={textAreaRef}
            height="100%"
            showGutter={false}
            enableBasicAutocompletion={true}
            enableSnippets={true}
            onLoad={handleEditorLoad}
            enableLiveAutocompletion={true}
            showPrintMargin={false}
            theme="iplastic"
            onChange={handleOnChange}
            name="UNIQUE_ID_OF_DIV"
            fontSize={16}
            value={sqlOfQuqery}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} className="min-h-[200px]">
        <div className=" h-full w-full items-center justify-center">
          <DataPage
            node={node}
            inputSql={sqlOfQuqery}
            readOnly={true}
            clickFlag={clickFlag}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
export default QueryPage
