import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"

import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import { Button } from "../../components/ui/button"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { LoadingSpinner } from "../components/spinner"
import { MysqlConfigComponent } from "./mysqlConfigComponent"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const formatMap = new Map([
  ["mysql", 0],
  ["sqlite", 1],
  ["postgresql", 2],
])
export function CreateLinkDialog() {
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const [currentLinkType, setCurrentLinkType] = useState("mysql")

  const [currentLinkName, setCurrentLinkName] = useState("")

  return (
    <>
      <DialogContent className="max-w-4xl overflow-clip ">
        <DialogHeader className="flex items-center text-center">
          <DialogTitle className="flex flex-col items-center">
            配置连接
          </DialogTitle>
          <Separator />
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="flex flex-row items-center gap-5 px-4">
            <p className="basis-2/12 text-right">连接名称:</p>
            <Input
              className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="连接名称"
              onChange={(e) => setCurrentLinkName(e.target.value)}
              value={currentLinkName}
            ></Input>
          </div>
          <div className="flex flex-row items-center gap-5 px-4">
            <p className="basis-2/12 text-right">连接类型:</p>
            <Select
              defaultValue={"mysql"}
              onValueChange={(e) => setCurrentLinkType(e)}
            >
              <SelectTrigger className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mysql">Mysql</SelectItem>
                <SelectItem value="sqlite">Sqlite</SelectItem>

                <SelectItem value="postgresql">PostGresql</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <MysqlConfigComponent connectionName={currentLinkName} />
        </div>
      </DialogContent>
    </>
  )
}
