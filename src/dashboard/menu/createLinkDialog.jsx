import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { set } from "date-fns"
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
import { MysqlConfigComponent } from "../components/mysqlConfigComponent"
import { LoadingSpinner } from "../components/spinner"
import SqliteConfigComponent from "../components/sqliteConfigComponent"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const baseConfigSchema = {
  base_config_enum: {
    mysql: {
      config: {
        host: "",
        database: "",
        user_name: "",
        password: "",
        port: 0,
      },
    },
    postgresql: {
      config: {
        host: "",
        database: "",
        user_name: "",
        password: "",
        port: 0,
      },
    },
  },
}
const CreateLinkDialog = ({
  baseCongfigId = null,
  isSave = false,
  isOpen = false,
}) => {
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const [currentLinkType, setCurrentLinkType] = useState("mysql")

  const [currentLinkName, setCurrentLinkName] = useState("")
  const [connectionData, setConnectionData] = useState(null)

  useEffect(() => {
    console.log(baseCongfigId)
    if (baseCongfigId) {
      initData()
    } else {
      setConnectionData(null)
      setCurrentLinkName("")
    }
  }, [isOpen])

  const initData = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("get_base_config_by_id", { baseConfigId: baseCongfigId })
    )
    console.log(response_code)
    console.log(response_msg)
    if (response_code === 0) {
      const { connection_name, connection_json } = response_msg
      setCurrentLinkName(connection_name)
      const parsedData = JSON.parse(connection_json)
      if (parsedData.base_config_enum.mysql) {
        setCurrentLinkType("mysql")
        console.log("MySQL Config:", parsedData.base_config_enum.mysql.config)
      }
      setConnectionData(parsedData)
    }
  }

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

          {currentLinkType === "mysql" && (
            <MysqlConfigComponent
              connectionName={currentLinkName}
              baseCongfigId={baseCongfigId}
              initialHost={
                connectionData?.base_config_enum?.mysql?.config?.host ||
                "localhost"
              }
              initialPort={
                connectionData?.base_config_enum?.mysql?.config?.port || "3306"
              }
              initialDatabase={
                connectionData?.base_config_enum?.mysql?.config?.database ??
                "mydb"
              }
              initialUsername={
                connectionData?.base_config_enum?.mysql?.config?.user_name ||
                "user"
              }
              initialPassword={
                connectionData?.base_config_enum?.mysql?.config?.password ||
                "password"
              }
              isSave={isSave}
            />
          )}
          {currentLinkType === "sqlite" && (
            <SqliteConfigComponent connectionName={currentLinkName} />
          )}
        </div>
      </DialogContent>
    </>
  )
}
export { CreateLinkDialog }
