import { createContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { platform } from "@tauri-apps/plugin-os"
import { Car } from "lucide-react"
import moment from "moment"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos } from "../../lib/jsx-utils"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/scorllableTable"

const ImportDataPage = ({ node }) => {
  const [filePath, setFilePath] = useState("")
  const { toast } = useToast()

  const handleSelectPathClick = async () => {
    const selected = await open({
      directory: false,
      multiple: false,
    })
    if (Array.isArray(selected)) {
      return
    } else if (selected === null) {
      return
    } else {
    }

    setFilePath(selected)
  }
  const handleImportDataOnClick = async () => {
    if (filePath === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No file chosen",
        duration: 1000,
      })
      return
    }
    if (!filePath.endsWith(".sql")) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only support sql file",
        duration: 1000,
      })
      return
    }
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    const importDatabaseReq = {
      file_path: filePath,
    }
    const { response_code, response_msg } = JSON.parse(
      await invoke("import_database", {
        listNodeInfoReq: listNodeInfoReq,
        importDatabaseReq: importDatabaseReq,
      })
    )
    if (response_code === 0) {
      toast({
        variant: "default",
        title: "Success",
        description: "Import success",
        duration: 1000,
      })
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response_msg,
        duration: 1000,
      })
    }
  }
  return (
    <div className="h-full w-full bg-muted p-4">
      <Card className="bg-background ">
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
        </CardHeader>
        <CardContent className=" flex flex-col gap-2">
          <div className="flex flex-row items-center justify-start gap-2">
            <div>Browser your computer</div>
            <Button
              size="sm"
              variant="outline"
              className="border border-muted"
              onClick={handleSelectPathClick}
            >
              Chose File
            </Button>
            {filePath ? (
              <div className="bg-muted">{filePath}</div>
            ) : (
              <span>No file chosen</span>
            )}
          </div>
          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4"></div>
            <Button
              className="text-xs"
              size="sm"
              onClick={() => handleImportDataOnClick()}
            >
              Start Import
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default ImportDataPage
