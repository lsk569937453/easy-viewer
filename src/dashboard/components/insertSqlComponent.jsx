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

const InsertSqlComponent = () => {
  return (
    <DialogContent className="w-30 bg-slate-200">
      <DialogTitle>创建新的Query</DialogTitle>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-row items-center justify-center">
          <p className="flex-[1]">Name:</p>
          <input className="flex h-10 w-full flex-[3] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
        <Button> Save</Button>
      </div>
    </DialogContent>
  )
}
export default InsertSqlComponent
