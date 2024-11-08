import AceEditor from "react-ace"

import "ace-builds/src-noconflict/mode-java"
import "ace-builds/src-noconflict/mode-sql"

import { useEffect, useRef, useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { DataTable } from "../../dashboard/components/table"
import DataPage from "./dataPage"

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

import { useHotkeys } from "react-hotkeys-hook"

const QueryPage = ({ node, setTabsState, tabIndex }) => {
  const [sqlOfQuqery, setSqlOfQuery] = useState("")
  const textAreaRef = useRef(null)

  //it is used to communicate with the child of datapage
  const [clickFlag, setClickFlag] = useState(false)
  useHotkeys("ctrl+s", () => handleOnSave(), {})
  const handleEditorLoad = (editor) => {
    // Add the custom save command
    editor.commands.addCommand({
      name: "save",
      bindKey: { win: "Ctrl-S", mac: "Cmd-S" },
      exec: (editor) => handleOnSave(),
    })
  }
  const handleOnSave = () => {
    console.log("ctrl+s")
    setTabsState((prevTabsState) =>
      prevTabsState.filter((tab) => tab !== tabIndex)
    )
  }
  const handleOnChange = (sql) => {
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
      <ResizablePanel defaultSize={25} className="min-h-[200px]">
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
      <ResizablePanel defaultSize={75}>
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
