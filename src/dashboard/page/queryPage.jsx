import AceEditor from "react-ace"

import "ace-builds/src-noconflict/mode-java"
import "ace-builds/src-noconflict/mode-sql"

import { useEffect, useRef, useState } from "react"

import { DataTable } from "../../dashboard/components/table"

import "ace-builds/src-noconflict/theme-github"
import "ace-builds/src-noconflict/theme-iplastic"

const QueryPage = () => {
  const [sql, setSql] = useState("")
  const [tableHeight, setTableHeight] = useState(900)

  const handleOnChange = (sql) => {
    setSql(sql)
  }
  useEffect(() => {
    setTableHeight(window.innerHeight - 40)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex cursor-pointer flex-row items-center p-2 text-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A.998.998 0 0 0 5 3v18a1 1 0 0 0 .536.886zM7 4.909 17.243 12 7 19.091V4.909z" />
        </svg>
        <a>Run</a>
      </div>
      <AceEditor
        className=" resize-y	  border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground  focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
        mode="sql"
        width="100%"
        height={tableHeight.toString() + "px"}
        // height="100%"
        showGutter={false}
        enableBasicAutocompletion={true}
        enableSnippets={true}
        enableLiveAutocompletion={true}
        showPrintMargin={false}
        theme="iplastic"
        onChange={handleOnChange}
        name="UNIQUE_ID_OF_DIV"
        fontSize={16}
        value={sql}
      />
    </div>
  )
}
export default QueryPage
