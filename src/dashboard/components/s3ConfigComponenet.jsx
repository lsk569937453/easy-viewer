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

export function S3ConfigComponent({
  connectionName,
  initialHost = "localhost",
  initialPort = "1433",
  initialDatabase = "mydb",
  initialUsername = "sa",
  initialsecret_key = "secret_key",
  isSave = false,
  baseCongfigId = null,
}) {
  const { treeRef, menulist, setMenulist } = useContext(SidebarContext)
  const { setShowEditConnectionDialog } = useContext(MainPageDialogContext)
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const [currentLinkType, setCurrentLinkType] = useState("s3")
  const [currentUrl, setCurrentUrl] = useState(
    `s3://${initialUsername}:${initialsecret_key}@${initialHost}:${initialPort}/${initialDatabase}`
  )
  const [currentHost, setCurrentHost] = useState(initialHost)
  const [currentPort, setCurrentPort] = useState(initialPort)
  const [currentRegion, setCurrentRegion] = useState(initialDatabase)
  const [currentAccessKey, setCurrentAccessKey] = useState(initialUsername)
  const [currentSecretKey, setCurrentSecretKey] = useState(initialsecret_key)
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    setCurrentHost(initialHost)
    setCurrentPort(initialPort)
    setCurrentRegion(initialDatabase)
    setCurrentAccessKey(initialUsername)
    setCurrentSecretKey(initialsecret_key)
    setCurrentUrl(
      `s3://${initialUsername}:${initialsecret_key}@${initialHost}:${initialPort}/${initialDatabase}`
    )
  }, [
    initialHost,
    initialPort,
    initialDatabase,
    initialUsername,
    initialsecret_key,
  ])

  const handleTestLinkButtonClick = async () => {
    let testHostStruct = null
    testHostStruct = {
      s3: {
        config: {
          host: currentHost,
          port: parseInt(currentPort),
          region: currentRegion,
          access_key: currentAccessKey,
          secret_key: currentSecretKey,
        },
      },
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
          description: "Connect successful.",
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
      /s3:\/\/(?<userName>[^:]+):(?<secret_key>[^@]+)@(?<ip>[^:]+):(?<port>\d+)(?:\/(?<database>[^?]+))?/
    const match = connectionUrl.match(regex)

    if (match) {
      const { userName, secret_key, ip, port, database } = match.groups
      return { userName, secret_key, ip, port, database: database || null }
    } else {
      throw new Error("Invalid s3 URL format")
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
    testHostStruct = {
      s3: {
        config: {
          host: currentHost,
          port: parseInt(currentPort),
          region: currentRegion,
          access_key: currentAccessKey,
          secret_key: currentSecretKey,
        },
      },
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
        description: "Save successful.",
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
        const { ip, port, database, userName, secret_key } =
          parseConnectionUrl(currentUrl)
        testHostStruct = {
          s3: {
            config: {
              host: ip,
              port: parseInt(port),
              region: database,
              access_key: userName,
              secret_key: secret_key,
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
        s3: {
          config: {
            host: currentHost,
            port: parseInt(currentPort),
            region: currentRegion,
            access_key: currentUsername,
            secret_key: currentSecretKey,
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
        description: "Save successful.",
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
        <p className="basis-2/12 text-right">Host:</p>
        <Input
          className="basis-6/12 border border-foreground/50 focus:border-transparent focus:ring-0"
          placeholder="Host"
          onChange={(e) => setCurrentHost(e.target.value)}
          value={currentHost}
        ></Input>
        <p className="basis-1/12 text-right">Port:</p>
        <Input
          className="basis-1/12 border border-foreground/50 focus:border-transparent focus:ring-0"
          placeholder="Port"
          onChange={(e) => setCurrentPort(e.target.value)}
          value={currentPort}
        ></Input>
      </div>

      <div className="flex flex-row items-center gap-5">
        <p className="basis-2/12 text-right">Access Key:</p>
        <Input
          className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
          placeholder="Access Key"
          onChange={(e) => setCurrentAccessKey(e.target.value)}
          value={currentAccessKey}
        ></Input>
      </div>
      <div className="flex flex-row items-center gap-5">
        <p className="basis-2/12 text-right">Secret Key:</p>
        <Input
          className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
          placeholder="Secret Key"
          type="secret_key"
          onChange={(e) => setCurrentSecretKey(e.target.value)}
          value={currentSecretKey}
        ></Input>
      </div>
      <div className="flex flex-row items-center gap-5">
        <p className="basis-2/12 text-right">Database:</p>
        <Input
          className="basis-10/12 border border-foreground/50 focus:border-transparent focus:ring-0"
          placeholder="database"
          onChange={(e) => setCurrentRegion(e.target.value)}
          value={currentRegion}
        ></Input>
      </div>

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
