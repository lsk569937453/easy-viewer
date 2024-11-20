import { useContext, useEffect, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"
import { format, set } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"

const UpdateColumnDialog = ({ node, columnData }) => {
  console.log(columnData)
  const [columnName, setColumnName] = useState(columnData[0])
  const [columnType, setColumnType] = useState(columnData[1])
  const [defaultValue, setDefaultValue] = useState(columnData.default)
  const [columnComment, setColumnComment] = useState(columnData.comment)

  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-1/2  translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <div className="flex h-full items-center justify-center">
          <h1 className="pb-4 text-lg font-bold">Update Column</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/2 flex-col truncate pr-4 text-right">
              <span>Name:</span>
            </div>
            <Input
              type="email"
              className="basis-1/2"
              value={columnName} // Use the item directly
              onChange={(e) => setColumnName(e.target.value)}
            />
          </div>
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/2 flex-col truncate pr-4 text-right">
              <span>Type:</span>
            </div>
            <Input
              type="email"
              className="basis-1/2"
              value={columnType}
              onChange={(e) => setColumnType(e.target.value)}
            />
          </div>
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/2  flex-col truncate pr-4 text-right">
              <span>default:</span>
            </div>
            <Input
              type="email"
              className="basis-1/2"
              value={defaultValue} // Use the item directly
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </div>
          <div className="flex flex-row items-center justify-center ">
            <div class="flex basis-1/2  flex-col truncate pr-4 text-right">
              <span>comment:</span>
            </div>
            <Input
              type="email"
              className="basis-1/2"
              value={columnComment} // Use the item directly
              onChange={(e) => setColumnComment(e.target.value)}
            />
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
