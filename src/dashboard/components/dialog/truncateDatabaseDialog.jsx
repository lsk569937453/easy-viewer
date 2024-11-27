import React, { useContext, useEffect, useRef, useState } from "react"

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

import { MainPageDialogContext } from "../../page"

const TruncateDatabaseDialog = ({}) => {
  const { setShowTruncateDatabaseDialog, showTruncateDatabaseDialog } =
    useContext(MainPageDialogContext)
  return (
    <Dialog
      open={showTruncateDatabaseDialog}
      onOpenChange={setShowTruncateDatabaseDialog}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to truncate the database?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <div className="flex flex-row items-center justify-center gap-2">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                // onClick={handleDeleteConnectionClick}
              >
                Delete
              </Button>
            </div>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default TruncateDatabaseDialog
