import * as Tabs from "@radix-ui/react-tabs"
import AceEditor from "react-ace"

import "ace-builds/src-noconflict/mode-sql"
import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

import { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import beautify from "ace-builds/src-noconflict/ext-beautify"
import { set } from "date-fns"

import { getLevelInfos, uuid } from "../../lib/utils"
import DataPage from "./dataPage"
import PropertiesColumnPage from "./propertiesColumnPage"
import PropertiesPage from "./propertiesPage"

const PropertiesTabsPage = ({ node }) => {
  const [sql, setSql] = useState("select *from test limit 100")
  const editorRef = useRef()

  useEffect(() => {
    loadDDl()
  }, [])
  useEffect(() => {
    if (editorRef.current) {
      beautify.beautify(editorRef.current.editor.session)
    }
  }, [sql])
  const loadDDl = async () => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("get_ddl", { listNodeInfoReq: listNodeInfoReq, sql: sql })
    )
    console.log(response_code, response_msg)
    if (response_code == 0) {
      setSql(response_msg)
    }
  }
  return (
    <Tabs.Root defaultValue="column" className="flex h-full w-full flex-col">
      <Tabs.List className="inline-flex h-10 flex-none items-center justify-start  rounded-md p-1 text-muted-foreground">
        <Tabs.Trigger
          value="ddl"
          className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-2 data-[state=active]:border-muted data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          <div className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="green"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-pencil"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
              <path d="M13.5 6.5l4 4" />
            </svg>
            <p>DDL</p>
          </div>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="column"
          className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-2 data-[state=active]:border-muted data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          <div className="flex items-center space-x-1">
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-database stroke-blue-500"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 6m-8 0a8 3 0 1 0 16 0a8 3 0 1 0 -16 0" />
              <path d="M4 6v6a8 3 0 0 0 16 0v-6" />
              <path d="M4 12v6a8 3 0 0 0 16 0v-6" />
            </svg>
            <p>Column</p>
          </div>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="foreignKey"
          className="inline-flex items-center justify-center whitespace-nowrap  px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-2 data-[state=active]:border-muted data-[state=active]:bg-background data-[state=active]:text-foreground "
        >
          <div className="flex items-center space-x-1">
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-chart-dots-3 stroke-amber-500"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M16 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M9 17l5 -1.5" />
              <path d="M6.5 8.5l7.81 5.37" />
              <path d="M7 7l8 -1" />
            </svg>
            <p>Foreign Key</p>
          </div>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="index"
          className="inline-flex items-center justify-center whitespace-nowrap  px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-2 data-[state=active]:border-muted data-[state=active]:bg-background data-[state=active]:text-foreground "
        >
          <div className="flex items-center space-x-1">
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
              class="icon icon-tabler icons-tabler-outline icon-tabler-chart-dots-3 stroke-amber-500"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M16 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M9 17l5 -1.5" />
              <path d="M6.5 8.5l7.81 5.37" />
              <path d="M7 7l8 -1" />
            </svg>
            <p>Index</p>
          </div>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content
        value="ddl"
        className="mt-2 h-full w-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <AceEditor
          className="   min-h-[22px] basis-11/12 resize-y	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
          ref={editorRef}
          commands={beautify.commands}
          mode="sql"
          height="100%"
          width="100%"
          showGutter={false}
          enableBasicAutocompletion={true}
          enableSnippets={true}
          readOnly={true}
          enableLiveAutocompletion={true}
          showPrintMargin={false}
          theme="iplastic"
          name="UNIQUE_ID_OF_DIV"
          fontSize={16}
          value={sql}
        />
      </Tabs.Content>

      <Tabs.Content
        value="column"
        className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <PropertiesColumnPage node={node} />
      </Tabs.Content>
      <Tabs.Content
        value="foreignKey"
        className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <p>sss3</p>
      </Tabs.Content>
      <Tabs.Content
        value="index"
        className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <p>sss3</p>
      </Tabs.Content>
    </Tabs.Root>
  )
}
export default PropertiesTabsPage
