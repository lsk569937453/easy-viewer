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

export function MysqlConfigComponent({ connectionName }) {
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const [currentLinkType, setCurrentLinkType] = useState("mysql")
  const [currentUrl, setCurrentUrl] = useState(
    "mysql://user:password@localhost:3306/mydb"
  )
  const [currentHost, setCurrentHost] = useState("localhost")
  const [currentPort, setCurrentPort] = useState("3306")
  const [currentDatabase, setCurrentDatabase] = useState("mydb")
  const [currentUsername, setCurrentUsername] = useState("user")
  const [currentPassword, setCurrentPassword] = useState("password")
  const [connectType, setConnectType] = useState("connectTypeHost")
  const [showLoading, setShowLoading] = useState(false)
  const handleTestLinkButtonClick = async () => {
    let testHostStruct = null
    if (connectType == "connectTypeUrl") {
      try {
        const { ip, port, database, userName, password } =
          parseConnectionUrl(currentUrl)
        testHostStruct = {
          mysql: {
            config: {
              host: ip,
              port: parseInt(port),
              database: database,
              user_name: userName,
              password: password,
            },
          },
        }
        console.log(JSON.stringify(testHostStruct))
      } catch (err) {
        toast({
          variant: "destructive",
          title: err.toString(),
          description: currentUrl,
        })
        return
      }
    } else {
      testHostStruct = {
        mysql: {
          config: {
            host: currentHost,
            port: parseInt(currentPort),
            database: currentDatabase,
            user_name: currentUsername,
            password: currentPassword,
          },
        },
      }
    }

    const testDatabaseRequest = {
      base_config_enum: testHostStruct,
    }
    console.log("req:" + JSON.stringify(testDatabaseRequest))
    setShowLoading(true)
    try {
      const datass = await invoke("test_url", {
        testDatabaseRequest: testDatabaseRequest,
      })
      const { response_code, response_msg } = JSON.parse(datass)
      setShowLoading(false)
      console.log(response_code)
      console.log(response_msg)
      if (response_code === 0) {
        toast({
          title: "操作信息",
          description: "数据库连接成功。",
        })
      } else {
        toast({
          variant: "destructive",
          title: "操作信息",
          description: response_msg,
        })
      }
    } catch (err) {
      setShowLoading(false)
      toast({
        variant: "destructive",
        title: "操作信息",
        description: err.toString(),
      })
    }
  }
  const parseConnectionUrl = (connectionUrl) => {
    const regex =
      /mysql:\/\/(?<userName>[^:]+):(?<password>[^@]+)@(?<ip>[^:]+):(?<port>\d+)(?:\/(?<database>[^?]+))?/
    const match = connectionUrl.match(regex)

    if (match) {
      const { userName, password, ip, port, database } = match.groups
      return { userName, password, ip, port, database: database || null }
    } else {
      throw new Error("Invalid MySQL URL format")
    }
  }
  const handleCreateLinkButtonClick = async () => {
    if (connectionName === undefined || connectionName === "") {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: "连接名称不能为空",
      })
      return
    }
    let testHostStruct = null
    if (connectType == "connectTypeUrl") {
      try {
        const { ip, port, database, userName, password } =
          parseConnectionUrl(currentUrl)
        testHostStruct = {
          mysql: {
            config: {
              host: ip,
              port: parseInt(port),
              database: database,
              user_name: userName,
              password: password,
            },
          },
        }
        console.log(JSON.stringify(testHostStruct))
      } catch (err) {
        toast({
          variant: "destructive",
          title: err.toString(),
          description: currentUrl,
        })
        return
      }
    } else {
      testHostStruct = {
        mysql: {
          config: {
            host: currentHost,
            port: parseInt(currentPort),
            database: currentDatabase,
            user_name: currentUsername,
            password: currentPassword,
          },
        },
      }
    }

    const SaveConnectionRequest = {
      base_config: { base_config_enum: testHostStruct },
      connection_name: connectionName,
    }
    console.log(connectionName)
    const { response_code, response_msg } = await JSON.parse(
      await invoke("save_base_config", {
        saveConnectionRequest: SaveConnectionRequest,
      })
    )
    console.log(response_code)
    console.log(response_msg)
    if (response_code === 0) {
      toast({
        title: "操作信息",
        description: "保存成功。",
      })
      window.location.reload()
    } else {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: response_msg,
      })
    }
  }
  return (
    <div className="flex flex-col gap-5 border-2 border-dashed border-indigo-600  p-4">
      <AlertDialog open={showLoading} onOpenChange={setShowLoading}>
        <AlertDialogContent className="w-30 ">
          <LoadingSpinner size={48} color="indigo" />
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-row items-center gap-5">
        <p className="basis-2/12 text-right">连接方式:</p>
        <RadioGroup
          defaultValue="connectTypeHost"
          orientation="horizontal"
          className="grid-flow-col"
          onValueChange={(e) => setConnectType(e)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="connectTypeHost" id="option-two" />
            <Label htmlFor="connectTypeHost">主机</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="connectTypeUrl" id="option-one" />
            <Label htmlFor="connectTypeUrl">连接串</Label>
          </div>
        </RadioGroup>
      </div>
      {connectType === "connectTypeUrl" && (
        <div className="flex flex-row items-center gap-5">
          <p className="basis-2/12 text-right">连接串:</p>
          <Input
            className="basis-10/12 border border-foreground/50"
            placeholder="jdbc:mysql://localhost:3306/"
            onChange={(e) => setCurrentUrl(e.target.value)}
            value={currentUrl}
          ></Input>
        </div>
      )}
      {connectType === "connectTypeHost" && (
        <>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">服务器地址:</p>
            <Input
              className="basis-6/12 border border-foreground/50"
              placeholder="主机地址"
              onChange={(e) => setCurrentHost(e.target.value)}
              value={currentHost}
            ></Input>
            <p className="basis-1/12 text-right">端口:</p>
            <Input
              className="basis-1/12 border border-foreground/50"
              placeholder="端口"
              onChange={(e) => setCurrentPort(e.target.value)}
              value={currentPort}
            ></Input>
          </div>

          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">用户名:</p>
            <Input
              className="basis-10/12 border border-foreground/50"
              placeholder="用户名"
              onChange={(e) => setCurrentUsername(e.target.value)}
              value={currentUsername}
            ></Input>
          </div>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">密码:</p>
            <Input
              className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="密码"
              onChange={(e) => setCurrentPassword(e.target.value)}
              value={currentPassword}
            ></Input>
          </div>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">数据库:</p>
            <Input
              className="basis-10/12 border border-foreground/50"
              placeholder="数据库名"
              onChange={(e) => setCurrentDatabase(e.target.value)}
              value={currentDatabase}
            ></Input>
          </div>
        </>
      )}

      <div className="flex flex-row items-center gap-5">
        <Button className="basis-6/12" onClick={handleCreateLinkButtonClick}>
          创建连接
        </Button>
        <Button
          className="basis-6/12"
          variant="outline"
          onClick={handleTestLinkButtonClick}
        >
          测试连接
        </Button>
      </div>
    </div>
  )
}
