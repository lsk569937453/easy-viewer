import { useContext, useEffect, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"
import { format, set } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import Select, { components } from "react-select"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos } from "../../lib/jsx-utils"
import { PropertiesColumnContext } from "../page/propertiesColumnPage"

const InputSelect = (props) => (
  <components.Input {...props} isHidden={false} className="text-xs" />
)
const options = [
  { value: "INT", label: "INT" },
  { value: "VARCHAR", label: "VARCHAR" },
  { value: "CHAR", label: "CHAR" },
  { value: "DATETIME", label: "DATETIME" },
  { value: "TIMESTAMP", label: "TIMESTAMP" },
  { value: "DATE", label: "DATE" },
  { value: "BIT", label: "BIT" },
  { value: "FLOAT", label: "FLOAT" },
  { value: "DOUBLE", label: "DOUBLE" },
  { value: "DECIMAL", label: "DECIMAL" },
  { value: "BIGINT", label: "BIGINT" },
  { value: "TEXT", label: "TEXT" },
  { value: "JSON", label: "JSON" },
  { value: "BLOB", label: "BLOB" },
  { value: "BINARY", label: "BINARY" },
]
const UpdateColumnComponent = ({
  node,
  columnData = ["", "", "YES", "", ""],
}) => {
  const { toast } = useToast()

  const { setShowUpdateColumnDialog, exeSql } = useContext(
    PropertiesColumnContext
  )
  console.log(columnData)
  columnData[1] = columnData[1]?.toUpperCase()
  const defaultZeroFill = columnData[1]?.includes("ZEROFILL")
  const defaultUnsigned = columnData[1]?.includes("UNSIGNED")
  const defaultColumnType = columnData[1]?.split(" ")[0]

  const [sourceColumnName, setSourceColumnName] = useState(columnData[0])
  const [columnName, setColumnName] = useState(columnData[0])
  const [isNull, setIsNull] = useState(columnData[2] === "YES")
  const [currentOptions, setCurrentOptions] = useState(options)
  const [defaultValue, setDefaultValue] = useState(columnData[4])
  const [columnComment, setColumnComment] = useState(columnData[2])
  const [isZeroFill, setIsZeroFill] = useState(defaultZeroFill)
  const [isUnsigned, setIsUnsigned] = useState(defaultUnsigned)

  const getDefaultEndFix = () => {
    if (isNull && !defaultValue) {
      return "DEFAULT NULL"
    } else if (isNull && defaultValue) {
      return `DEFAULT ${defaultValue}`
    } else if (!isNull && !defaultValue) {
      return "NOT NULL"
    } else if (!isNull && defaultValue) {
      return `NOT NULL DEFAULT ${defaultValue}`
    }
  }
  const getCommentEndFix = () => {
    if (columnComment) {
      return `COMMENT '${columnComment}'`
    }
    return ""
  }
  const [updateColumnSql, setUpdateColumnSql] = useState(() => {
    return `ALTER TABLE \`${node?.data?.name || "unknown_table"}\` 
      CHANGE \`${sourceColumnName || "unknown_column"}\` \`${
        columnData[0] || "unknown_column"
      }\` ${defaultColumnType || "VARCHAR(255)"}  
      ${isZeroFill ? "ZEROFILL" : ""}  
      ${isUnsigned ? "UNSIGNED" : ""} 
      ${getDefaultEndFix()}
      ${getCommentEndFix()};`
  })

  const [selectValue, setSelectValue] = useState({
    value: defaultColumnType,
    label: defaultColumnType,
  })
  const [selectInputValue, setSelectInputValue] = useState(defaultColumnType)
  useEffect(() => {
    setCurrentOptions(options)
    console.log(columnData)

    const defaultZeroFill = columnData[1]?.includes("ZEROFILL")
    const defaultUnsigned = columnData[1]?.includes("UNSIGNED")
    const defaultColumnType = columnData[1]?.split(" ")[0]
    console.log(columnData[1], defaultValue, defaultZeroFill)
    setIsZeroFill(defaultZeroFill)
    setIsUnsigned(defaultUnsigned)
    setColumnName(columnData[0])
    setSourceColumnName(columnData[0])
    setIsNull(columnData[2] === "YES")

    setDefaultValue(columnData.default)
    setColumnComment(columnData.comment)
    const defaultValueEndfix = getDefaultEndFix()
    const commentEndfix = getCommentEndFix()
    setUpdateColumnSql(`ALTER TABLE \`${node.data.name}\` 
    CHANGE \`${sourceColumnName}\` \`${columnData[0]}\` ${defaultColumnType} ${
      isZeroFill ? "ZEROFILL" : ""
    }  ${
      isUnsigned ? "UNSIGNED" : ""
    }  ${defaultValueEndfix}  ${commentEndfix} ;`)

    const isInOptions = options.some(
      (option) => option.value === defaultColumnType
    )
    if (!isInOptions) {
      const newOption = { value: defaultColumnType, label: defaultColumnType }
      setCurrentOptions((prevOptions) => [...prevOptions, newOption])
    }
    setSelectValue({ value: defaultColumnType, label: defaultColumnType })
    setSelectInputValue(defaultColumnType)
  }, [columnData])

  useEffect(() => {
    const defaultValueEndfix = getDefaultEndFix()
    const commentEndfix = getCommentEndFix()
    setUpdateColumnSql(`ALTER TABLE \`${node.data.name}\`
    CHANGE \`${sourceColumnName}\` \`${columnName}\` ${selectInputValue} ${
      isZeroFill ? "ZEROFILL" : ""
    }  ${
      isUnsigned ? "UNSIGNED" : ""
    }  ${defaultValueEndfix}  ${commentEndfix} ;`)
  }, [
    columnName,
    selectInputValue,
    isNull,
    isZeroFill,
    isUnsigned,
    defaultValue,
    columnComment,
  ])

  const selectRef = useRef()

  const onInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      setSelectInputValue(inputValue)
    }
  }

  const onChange = (option) => {
    setSelectValue(option)
    setSelectInputValue(option ? option.label : "")
  }

  const onFocus = () => value && selectRef.current.select.inputRef.select()
  const handleUpdateOnClick = async () => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    const response = await invoke("exe_sql", {
      listNodeInfoReq: listNodeInfoReq,
      sql: updateColumnSql,
    })
    const { response_code, response_msg } = JSON.parse(response)
    if (response_code == 0) {
      exeSql()
      setShowUpdateColumnDialog(false)
    } else {
      toast({
        variant: "destructive",
        title: "Sql Error",
        description: response_msg,
      })
    }
  }
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-1/2  translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <div className="flex h-full items-center justify-center">
          <h1 className="pb-4 text-lg font-bold">Update Column</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/3 flex-col truncate pr-4 text-right">
              <span>name:</span>
            </div>
            <Input
              className="basis-2/3"
              value={columnName} // Use the item directly
              onChange={(e) => setColumnName(e.target.value)}
            />
          </div>
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/3 flex-col truncate pr-4 text-right">
              <span>type:</span>
            </div>
            <Select
              ref={selectRef}
              options={currentOptions}
              isClearable={true}
              value={selectValue}
              inputValue={selectInputValue}
              onInputChange={onInputChange}
              onChange={onChange}
              onFocus={onFocus}
              controlShouldRenderValue={false}
              components={{
                Input: InputSelect,
              }}
              className="basis-2/3"
            />
          </div>
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/3  flex-col truncate pr-4 text-right">
              <span>default:</span>
            </div>
            <Input
              className="basis-2/3"
              value={defaultValue} // Use the item directly
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </div>
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/3  flex-col truncate pr-4 text-right">
              <span>comment:</span>
            </div>
            <Input
              className="basis-2/3"
              value={columnComment} // Use the item directly
              onChange={(e) => setColumnComment(e.target.value)}
            />
          </div>
        </div>
        <div className=" flex flex-row items-center justify-around gap-1">
          <div className="flex flex-row">
            <div class="  truncate  text-right ">
              <span>Not Null:</span>
            </div>
            <div className=" items-center justify-center">
              <Checkbox
                checked={!isNull}
                onCheckedChange={(checked) => setIsNull(!checked)}
              />
            </div>
          </div>

          <div className="flex flex-row">
            <div class="  truncate  text-right ">
              <span>Zero Fill:</span>
            </div>
            <div className=" items-center justify-center">
              <Checkbox
                checked={isZeroFill}
                onCheckedChange={(checked) => setIsZeroFill(checked)}
              />
            </div>
          </div>
          <div className="flex flex-row">
            <div class="  truncate  text-right ">
              <span>UNSIGNED:</span>
            </div>
            <div className=" items-center justify-center">
              <Checkbox
                checked={isUnsigned}
                onCheckedChange={(checked) => setIsUnsigned(checked)}
              />
            </div>
          </div>
        </div>
        <div className="flex h-full flex-row items-center justify-center">
          <Button
            className="basis-1/4"
            variant="secondary"
            onClick={() => setShowUpdateColumnDialog(false)}
          >
            {" "}
            Cancel
          </Button>
          <Button className="basis-1/4" onClick={handleUpdateOnClick}>
            {" "}
            Update
          </Button>
        </div>
        <div className="flex h-full w-full flex-row items-center justify-center">
          <SyntaxHighlighter
            language="sql"
            style={coy}
            className=" w-full "
            codeTagProps={{
              style: {
                whiteSpace: "normal",
              },
            }}
          >
            {updateColumnSql}
          </SyntaxHighlighter>
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.DialogPortal>
  )
}
export default UpdateColumnComponent
