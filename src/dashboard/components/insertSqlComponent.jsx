import { useContext, useEffect, useState } from "react"

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
    <DialogContent className="flex  w-full flex-col bg-slate-200">
      <DialogTitle>创建新的Query</DialogTitle>
      <div className="flex  w-full flex-col">
        <div class="grid  w-full grid-cols-4 gap-4 p-4">
          <span class=" text-right font-medium text-gray-700">
            Label 1:ssssssssssssssssssssssssssssssssssss
          </span>
          <input
            type="text"
            class="flex-1 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring focus:ring-blue-300"
            placeholder="Enter value"
          />

          <label class=" text-right font-medium text-gray-700">
            Label:
          </label>
          <input
            type="text"
            class="flex-1 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring focus:ring-blue-300"
            placeholder="Enter value"
          />
          <label class="text-right font-medium text-gray-700">
            Label as:
          </label>
          <input
            type="text"
            class="flex-1 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring focus:ring-blue-300"
            placeholder="Enter value"
          />
          <label class=" text-right font-medium text-gray-700">
            Label sd:
          </label>
          <input
            type="text"
            class="flex-1 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring focus:ring-blue-300"
            placeholder="Enter value"
          />
        </div>

        <Button> Save{columnDataArray.length}</Button>
      </div>
    </DialogContent>
  )
}
export default InsertSqlComponent
