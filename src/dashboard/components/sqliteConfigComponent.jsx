import { useContext, useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
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
import { SidebarContext } from "../page"
import { LoadingSpinner } from "./spinner"

const SqliteConfigComponent = ({
  isSave = false,
  connectionName,
  defaultFilePath = "",
  baseCongfigId = null,
}) => {
  const [filePath, setFilePath] = useState(defaultFilePath)
  const [connectType, setConnectType] = useState("connectTypeHost")
  const [showLoading, setShowLoading] = useState(false)
  const { toast } = useToast()
  const { treeRef, menulist, setMenulist, setShowEditConnectionDialog } =
    useContext(SidebarContext)
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
    console.log(selected)
    setFilePath(selected)
  }
  const handleSaveButtonOnClick = async () => {
    if (connectionName === undefined || connectionName === "") {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: "连接名称不能为空",
      })
      return
    }
    let testHostStruct = {
      sqlite: {
        file_path: filePath,
      },
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
    if (response_code === 0) {
      toast({
        title: "操作信息",
        description: "保存成功。",
      })
      reloadNode(treeRef.current.root, menulist, setMenulist)
    } else {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: response_msg,
      })
    }
    setShowEditConnectionDialog(false)
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
    let testHostStruct = {
      sqlite: {
        file_path: filePath,
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
    if (response_code === 0) {
      toast({
        title: "操作信息",
        description: "保存成功。",
      })
      reloadNode(treeRef.current.root, menulist, setMenulist)
      setShowEditConnectionDialog(false)
    } else {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: response_msg,
      })
    }
  }
  const handleTestLinkButtonClick = async () => {
    let req = {
      sqlite: {
        file_path: filePath,
      },
    }

    const testDatabaseRequest = {
      base_config_enum: req,
    }
    console.log("req:" + JSON.stringify(testDatabaseRequest))
    setShowLoading(true)
    try {
      const datass = await invoke("test_url", {
        testDatabaseRequest: testDatabaseRequest,
      })
      const { response_code, response_msg } = JSON.parse(datass)
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
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <div className="flex flex-col gap-5 border-2 border-dashed border-indigo-600  p-4">
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
            <Label htmlFor="connectTypeHost">本地文件</Label>
          </div>
        </RadioGroup>
      </div>

      {connectType === "connectTypeHost" && (
        <>
          <div className="flex flex-row items-center gap-5">
            <p className="basis-2/12 text-right">数据库路径:</p>
            <Input
              className="basis-6/12 border border-foreground/50 focus:border-transparent focus:ring-0"
              placeholder="路径"
              onChange={(e) => setFilePath(e.target.value)}
              value={filePath}
            ></Input>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              class="icon icon-tabler icons-tabler-filled icon-tabler-file cursor-pointer fill-primary"
              onClick={handleSelectPathClick}
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 2l.117 .007a1 1 0 0 1 .876 .876l.007 .117v4l.005 .15a2 2 0 0 0 1.838 1.844l.157 .006h4l.117 .007a1 1 0 0 1 .876 .876l.007 .117v9a3 3 0 0 1 -2.824 2.995l-.176 .005h-10a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-14a3 3 0 0 1 2.824 -2.995l.176 -.005h5z" />
              <path d="M19 7h-4l-.001 -4.001z" />
            </svg>
          </div>
        </>
      )}
      <div className="flex flex-row items-center gap-5">
        {!isSave && (
          <Button className="basis-6/12" onClick={handleCreateLinkButtonClick}>
            创建连接
          </Button>
        )}
        {isSave && (
          <Button className="basis-6/12" onClick={handleSaveButtonOnClick}>
            保存连接
          </Button>
        )}
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
export default SqliteConfigComponent
