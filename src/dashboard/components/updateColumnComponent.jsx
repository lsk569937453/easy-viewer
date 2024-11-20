import { useContext, useEffect, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"
import { format, set } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import Select, { components } from "react-select"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

const InputSelect = (props) => (
  <components.Input {...props} isHidden={false} className="text-xs" />
)

const UpdateColumnDialog = ({ node, columnData }) => {
  console.log(columnData)
  const [columnName, setColumnName] = useState(columnData[0])
  const [columnType, setColumnType] = useState(columnData[1])
  const [defaultValue, setDefaultValue] = useState(columnData.default)
  const [columnComment, setColumnComment] = useState(columnData.comment)
  const [option, setOption] = useState(null)
  useEffect(() => {
    setColumnName(columnData[0])
    setColumnType(columnData[1])
    setDefaultValue(columnData.default)
    setColumnComment(columnData.comment)
  }, [columnData])
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
  const [value, setValue] = useState()
  const [inputValue, setInputValue] = useState("")

  const selectRef = useRef()

  const onInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      setInputValue(inputValue)
    }
  }

  const onChange = (option) => {
    setValue(option)
    setInputValue(option ? option.label : "")
  }

  const onFocus = () => value && selectRef.current.select.inputRef.select()

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
              type="email"
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
              options={options}
              isClearable={true}
              value={value}
              inputValue={inputValue}
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
              type="email"
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
          <div className=" flex flex-row items-center justify-center">
            <div class="flex basis-1/4 flex-col truncate  pr-4 text-right ">
              <span>Not Null:</span>
            </div>
            <div className="basis-1/4 items-center justify-center">
              <Checkbox />
            </div>
            <div class="flex basis-1/4  flex-col truncate  pr-4  text-right">
              <span>Zero Fill:</span>
            </div>
            <div className="basis-1/4">
              <Checkbox />
            </div>
          </div>
        </div>
        <div className="flex h-full flex-row items-center justify-center">
          <Button
            className="basis-1/4"
            variant="secondary"
            // onClick={() => setShowDeleteDialog(false)}
          >
            {" "}
            Cancel
          </Button>
          <Button className="basis-1/4"> Confirm</Button>
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.DialogPortal>
  )
}
export default UpdateColumnDialog
