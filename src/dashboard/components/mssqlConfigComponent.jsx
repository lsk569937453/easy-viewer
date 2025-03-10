import { useContext, useEffect, useState } from "react"
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
import { reloadNode } from "../../lib/jsx-utils"
import { MainPageDialogContext, SidebarContext } from "../page"
import { LoadingSpinner } from "./spinner"

export function MssqlConfigComponent({
  connectionName,
  initialHost = "localhost",
  initialPort = "1433",
  initialDatabase = "mydb",
  initialUsername = "sa",
  initialPassword = "password",
  isSave = false,
  baseCongfigId = null,
}) {
  const { treeRef, menulist, setMenulist } = useContext(SidebarContext)
  const { setShowEditConnectionDialog } = useContext(MainPageDialogContext)
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const [currentLinkType, setCurrentLinkType] = useState("mssql")
  const [currentUrl, setCurrentUrl] = useState(
    `mssql://${initialUsername}:${initialPassword}@${initialHost}:${initialPort}/${initialDatabase}`
  )
  const [currentHost, setCurrentHost] = useState(initialHost)
  const [currentPort, setCurrentPort] = useState(initialPort)
  const [currentDatabase, setCurrentDatabase] = useState(initialDatabase)
  const [currentUsername, setCurrentUsername] = useState(initialUsername)
  const [currentPassword, setCurrentPassword] = useState(initialPassword)
  const [connectType, setConnectType] = useState("connectTypeHost")
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    setCurrentHost(initialHost)
    setCurrentPort(initialPort)
    setCurrentDatabase(initialDatabase)
    setCurrentUsername(initialUsername)
    setCurrentPassword(initialPassword)
    setCurrentUrl(
      `mssql://${initialUsername}:${initialPassword}@${initialHost}:${initialPort}/${initialDatabase}`
    )
  }, [
    initialHost,
    initialPort,
    initialDatabase,
    initialUsername,
    initialPassword,
  ])

  const handleTestLinkButtonClick = async () => {
    let testHostStruct = null
    if (connectType == "connectTypeUrl") {
      try {
        const { ip, port, database, userName, password } =
          parseConnectionUrl(currentUrl)
        testHostStruct = {
          mssql: {
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
        mssql: {
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
          title: "Operation Message",
          description: "Connection Success",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: response_msg,
        })
      }
    } catch (err) {
      setShowLoading(false)
      toast({
        variant: "destructive",
        title: "Operation Message",
        description: err.toString(),
      })
    }
  }
  const parseConnectionUrl = (connectionUrl) => {
    const regex =
      /mssql:\/\/(?<userName>[^:]+):(?<password>[^@]+)@(?<ip>[^:]+):(?<port>\d+)(?:\/(?<database>[^?]+))?/
    const match = connectionUrl.match(regex)

    if (match) {
      const { userName, password, ip, port, database } = match.groups
      return { userName, password, ip, port, database: database || null }
    } else {
      throw new Error("Invalid mssql URL format")
    }
  }
  const handleCreateLinkButtonClick = async () => {
    if (connectionName === undefined || connectionName === "") {
      toast({
        variant: "destructive",
        title: "Operation Message",
        description: "Connection name cannot be empty",
      })
      return
    }
    let testHostStruct = null
    if (connectType == "connectTypeUrl") {
      try {
        const { ip, port, database, userName, password } =
          parseConnectionUrl(currentUrl)
        testHostStruct = {
          mssql: {
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
        mssql: {
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
        title: "Operation Message",
        description: "Save Connection Success",
      })
      reloadNode(treeRef.current.root, menulist, setMenulist)
      setShowEditConnectionDialog(false)
    } else {
      toast({
        variant: "destructive",
        title: "Operation Message",
        description: response_msg,
      })
    }
  }
  const handleSaveButtonOnClick = async () => {
    if (connectionName === undefined || connectionName === "") {
      toast({
        variant: "destructive",
        title: "Operation Message",
        description: "Connection name cannot be empty",
      })
      return
    }
    let testHostStruct = null
    if (connectType == "connectTypeUrl") {
      try {
        const { ip, port, database, userName, password } =
          parseConnectionUrl(currentUrl)
        testHostStruct = {
          mssql: {
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
        mssql: {
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
      connection_id: Number(baseCongfigId),
    }
    console.log(connectionName)
    const { response_code, response_msg } = await JSON.parse(
      await invoke("update_base_config", {
        saveConnectionRequest: SaveConnectionRequest,
      })
    )
    console.log(response_code)
    console.log(response_msg)
    if (response_code === 0) {
      toast({
        title: "Operation Message",
        description: "Save Connection Success",
      })
      reloadNode(treeRef.current.root, menulist, setMenulist)
      setShowEditConnectionDialog(false)
    } else {
      toast({
        variant: "destructive",
        title: "Operation Message",
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
        <p className="basis-2/12 text-right">Connection Type:</p>
        <RadioGroup
          defaultValue="connectTypeHost"
          orientation="horizontal"
          className="grid-flow-col"
          onValueChange={(e) => setConnectType(e)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="connectTypeHost" id="option-two" />
            <Label htmlFor="connectTypeHost">Host</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="connectTypeUrl" id="option-one" />
            <Label htmlFor="connectTypeUrl">Url</Label>
          </div>
        </RadioGroup>
      </div>
      {connectType === "connectTypeUrl" && (
        <div className="flex flex-row items-center gap-5">
          <p className="basis-2/12 text-right">Connection Url:</p>
          <Input
            className="basis-10/12 border border-foreground/50"
            placeholder="jdbc:mssql://localhost:3306/"
            onChange={(e) => setCurrentUrl(e.target.value)}
            value={currentUrl}
          ></Input>
        </div>
      )}
      {connectType === "connectTypeHost" && (
        <>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">Host:</p>
            <Input
              className="basis-6/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="host"
              onChange={(e) => setCurrentHost(e.target.value)}
              value={currentHost}
            ></Input>
            <p className="basis-1/12 text-right">Port:</p>
            <Input
              className="basis-1/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="port"
              onChange={(e) => setCurrentPort(e.target.value)}
              value={currentPort}
            ></Input>
          </div>

          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">User:</p>
            <Input
              className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="User"
              onChange={(e) => setCurrentUsername(e.target.value)}
              value={currentUsername}
            ></Input>
          </div>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">Password:</p>
            <Input
              className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="password"
              type="password"
              onChange={(e) => setCurrentPassword(e.target.value)}
              value={currentPassword}
            ></Input>
          </div>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">Database:</p>
            <Input
              className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="database"
              onChange={(e) => setCurrentDatabase(e.target.value)}
              value={currentDatabase}
            ></Input>
          </div>
        </>
      )}

      <div className="flex flex-row items-center gap-5">
        {!isSave && (
          <Button className="basis-6/12" onClick={handleCreateLinkButtonClick}>
            Create Connection
          </Button>
        )}
        {isSave && (
          <Button className="basis-6/12" onClick={handleSaveButtonOnClick}>
            Save Connection
          </Button>
        )}
        <Button
          className="basis-6/12"
          variant="outline"
          onClick={handleTestLinkButtonClick}
        >
          Test Connection
        </Button>
      </div>
    </div>
  )
}
