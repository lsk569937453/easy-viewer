import { useContext, useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
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

const defaultColumnData = [
  {
    columnName: "sss",
    columnType: "int",
  },
]
const InsertSqlComponent = ({ columnDefaultData }) => {
  const [columnDataArray, setColumnDataArray] = useState(
    columnDefaultData || defaultColumnData
  )
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-1/2  translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <DialogTitle>创建新的Query</DialogTitle>
        <div className="flex  w-full flex-col">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-row">
              <div class="basis-1/3 truncate  text-right font-medium text-gray-700">
                s:
              </div>
              <Input type="email" placeholder="Email" className="basis-2/3" />
            </div>
            <div className="flex flex-row">
              <div class="basis-1/3 truncate  text-right font-medium text-gray-700">
                s:
              </div>
              <Input type="email" placeholder="Email" className="basis-2/3" />
            </div>
            <div className="flex flex-row">
              <div class="basis-1/3 truncate  text-right font-medium text-gray-700">
                s:
              </div>
              <Input type="email" placeholder="Email" className="basis-2/3" />
            </div>
          </div>
          <Button> Save{columnDataArray.length}</Button>
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.DialogPortal>
  )
}
export default InsertSqlComponent
