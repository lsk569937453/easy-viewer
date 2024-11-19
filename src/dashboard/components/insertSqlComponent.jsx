import { useContext, useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"
import { set } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { getLevelInfos } from "../../lib/jsx-utils"

const defaultColumnData = [
  {
    columnName: "sss",
    columnType: "int",
  },
]
const InsertSqlComponent = ({ node }) => {
  const [columnDataArray, setColumnDataArray] = useState([])
  const [tableName, setTableName] = useState("")
  const [columnValueArray, setColumnValueArray] = useState([])
  useEffect(() => {
    loadColumnData()
  }, [node])
  const loadColumnData = async () => {
    setTableName(node.data.name)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("get_column_info_for_insert_sql", {
        listNodeInfoReq: listNodeInfoReq,
      })
    )
    console.log(response_code, response_msg)
    if (response_code === 0) {
      const { list } = response_msg
      setColumnDataArray(list)
      setColumnValueArray(Array.from({ length: list.length }, () => ""))
    }
  }
  const handleInputOnChange = (e, index) => {
    console.log(e.target.value)
    const val = e.target.value
    setColumnValueArray(
      (prev) => prev.map((item, idx) => (idx === index ? val : item)) // Replace the string at the specific index
    )
    console.log(columnValueArray)
  }
  const handleSetDate = (date, index) => {
    console.log(date, index)
    setColumnValueArray(
      (prev) => prev.map((item, idx) => (idx === index ? date : item)) // Replace the string at the specific index
    )
  }
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-2/3  translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <div className="flex h-full items-center justify-center">
          <h1 className="pb-4 text-lg font-bold">
            Insert To table: {tableName}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {columnDataArray.map((item, index) => {
            return (
              <div className="flex flex-row items-center justify-center " key={index}>
                <div class="flex basis-2/3  flex-col truncate pr-4 text-right">
                  <span>
                    {" "}
                    <span className=" text-foreground/50 pr-2">
                      {item.column_type}
                    </span>
                    {item.column_name}:
                  </span>
                </div>
                {item.type_flag == 0 && (
                  <Input
                    type="email"
                    className="basis-1/3"
                    value={columnValueArray?.[index] || ""} // Use the item directly
                    onChange={(e) => handleInputOnChange(e, index)}
                  />
                )}
                {item.type_flag == 1 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !columnValueArray?.[index] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {columnValueArray?.[index] ? (
                          format(date, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={columnValueArray?.[index]}
                        onSelect={handleSetDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex h-full flex-row items-center justify-center">
          <Button className="basis-1/3" variant="secondary">
            {" "}
            Cancel
          </Button>
          <Button className="basis-1/3"> Save</Button>
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.DialogPortal>
  )
}
export default InsertSqlComponent
