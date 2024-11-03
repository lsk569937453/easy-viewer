import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { IconMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu"
import { set } from "date-fns"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { clickNode } from "../lib/node"
import { uuid } from "../lib/utils"
import Sidebar from "./components/sidebar"

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const [menulist, setMenulist] = useState([])
  const [pageDataArray, setPageDataArray] = useState([])
  const [tabValue, setTabValue] = useState(null)
  const [showQueryLoading, setShowQueryLoading] = useState(false)
  const [queryName, setQueryName] = useState("")
  const [baseConfigId, setBaseConfigId] = useState(null)
  const [nodeForUpdate, setNodeForUpdate] = useState(null)

  useEffect(() => {
    loadData()
  }, [])
  const handleContextMenu = async (event) => {
    event.preventDefault()

    const menu = await Menu.new()
    const openItem = await MenuItem.new({
      text: "Open",
      action: async () => {
        console.log("Open clicked")
      },
    })
    const refresh = await MenuItem.new({
      text: "刷新",
      action: async () => {
        console.log("Open clicked")
        window.location.reload()
      },
    })
    menu.append(refresh)
    menu.append(openItem)
    await menu.popup()
  }
  const loadData = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("get_base_config")
    )
    console.log(response_code)
    console.log("get_menu_config:" + JSON.stringify(response_msg))
    if (response_code == 0) {
      const newMenulist = response_msg.base_config_list.map((item, index) => {
        console.log(item)
        console.log(index)

        return {
          connectionType: item.connection_type,
          iconName: "mysql",
          showFirstIcon: true,
          showSecondIcon: true,
          key: index,
          id: uuid(),
          name: item.connection_name,
          baseConfigId: item.base_config_id,
        }
      })
      console.log("convert to:" + JSON.stringify(newMenulist))
      setMenulist(newMenulist)
    }
  }
  const handleAddPageClick = (item) => {
    console.log(item)
    const itemIndex = pageDataArray.findIndex(
      (existingItem) => existingItem.type === item.type
    )

    if (itemIndex > -1) {
      pageDataArray[itemIndex] = item
      console.log("aaaaa")
    } else {
      pageDataArray.push(item)
    }
    setTabValue(item.type)
    setPageDataArray([...pageDataArray])
  }
  const handleRemoveButton = (index) => {
    pageDataArray.splice(index, 1)
    const firstType =
      pageDataArray.length > 0 ? pageDataArray[0].type : undefined
    setTabValue(firstType)

    setPageDataArray([...pageDataArray])
  }
  const handleQuerySaveClick = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("save_query", {
        connectionId: baseConfigId,
        queryName: queryName,
        sql: null,
      })
    )
    if (response_code == 0) {
      console.log("保存成功")
      setShowQueryLoading(false)
      clickNode(nodeForUpdate, menulist, setMenulist)
    }
    setShowQueryLoading(false)
  }

  const renderComponent = () => {
    return (
      <Tabs
        value={tabValue}
        className="flex flex-col"
        onValueChange={setTabValue}
      >
        <TabsList className="flex w-full  flex-row items-start justify-start">
          {pageDataArray.map((item, index) => {
            return (
              <TabsTrigger
                value={item.type}
                key={index}
                className="justify-start"
              >
                <div className="relative flex flex-row items-center justify-center gap-1 p-10">
                  <div className="flex flex-row items-center justify-center gap-1">
                    <div className="flex-none"> {item.icon}</div>
                    <p className="grow"> {item.service}</p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    onClick={() => {
                      handleRemoveButton(index)
                    }}
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-x absolute right-2"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M18 6l-12 12" />
                    <path d="M6 6l12 12" />
                  </svg>
                </div>
              </TabsTrigger>
            )
          })}
        </TabsList>
        {pageDataArray.map((item, index) => {
          return (
            <TabsContent key={item.service} value={item.type} className="grow">
              {item.render}
            </TabsContent>
          )
        })}
      </Tabs>
    )
  }
  return (
    <>
      <div className="grid h-full max-h-full  grid-cols-10 divide-x divide-foreground/30  overflow-x-auto  overflow-y-auto ">
        <Dialog open={showQueryLoading} onOpenChange={setShowQueryLoading}>
          <DialogContent className="w-30 bg-slate-200">
            <DialogTitle>创建新的Query</DialogTitle>
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-row items-center justify-center">
                <p className="flex-[1]">Name:</p>
                <input
                  className="flex h-10 w-full flex-[3] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                />
              </div>
              <Button onClick={handleQuerySaveClick}> Save</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Sidebar
          menuList={menulist}
          handleAddPageClick={handleAddPageClick}
          setShowQueryLoading={setShowQueryLoading}
          setQueryName={setQueryName}
          setBaseConfigId={setBaseConfigId}
          setNodeForUpdate={setNodeForUpdate}
        />
        <div className="col-span-8">{renderComponent()}</div>
      </div>
    </>
  )
}
