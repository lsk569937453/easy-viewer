import { createContext, useEffect, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"
import { invoke } from "@tauri-apps/api/core"
// import { IconMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu"
import { set } from "date-fns"
import { useTranslation } from "react-i18next"

import "@szhsin/react-menu/dist/index.css"

import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { clickNode } from "../lib/node"
import { uuid } from "../lib/utils"
import Sidebar from "./components/sidebar"

export const SidebarContext = createContext({
  handleAddPageClick: () => {},
  setShowQueryLoading: () => {},
  setQueryName: () => {},
  setBaseConfigId: () => {},
  setNodeForUpdate: () => {},
  setShowDeleteConnectionDialog: () => {},
})
const DashboardPage = () => {
  const { t, i18n } = useTranslation()
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 })

  const [menulist, setMenulist] = useState([])
  const [pageDataArray, setPageDataArray] = useState([])
  const [tabValue, setTabValue] = useState(null)
  const [showQueryLoading, setShowQueryLoading] = useState(false)
  const [showDeleteConnectionDialog, setShowDeleteConnectionDialog] =
    useState(false)
  const [queryName, setQueryName] = useState("")
  const [baseConfigId, setBaseConfigId] = useState(null)
  const [nodeForUpdate, setNodeForUpdate] = useState(null)
  const [isOpen, setOpen] = useState(false)
  useEffect(() => {
    loadData()
  }, [])
  //   const handleContextMenu = async (event) => {
  //     event.preventDefault()

  //     const menu = await Menu.new()
  //     const openItem = await MenuItem.new({
  //       text: "Open",
  //       action: async () => {
  //         console.log("Open clicked")
  //       },
  //     })
  //     const refresh = await MenuItem.new({
  //       text: "刷新",
  //       action: async () => {
  //         console.log("Open clicked")
  //         window.location.reload()
  //       },
  //     })
  //     menu.append(refresh)
  //     menu.append(openItem)
  //     await menu.popup()
  //   }
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
      (existingItem) => existingItem.service === item.service
    )

    if (itemIndex > -1) {
      pageDataArray[itemIndex] = item
      console.log("aaaaa")
    } else {
      pageDataArray.push(item)
    }
    setTabValue(item.service)
    setPageDataArray([...pageDataArray])
  }
  const handleRemoveButton = (index) => {
    pageDataArray.splice(index, 1)
    const nextType =
      pageDataArray.length > index
        ? pageDataArray[index].service
        : pageDataArray.length > 0
          ? pageDataArray[pageDataArray.length - 1].service
          : undefined

    setTabValue(nextType)
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
  const handleDeleteConnectionClick = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("delete_base_config", {
        baseConfigId: Number(baseConfigId),
      })
    )
    if (response_code == 0) {
      console.log("删除成功")
      setShowDeleteConnectionDialog(false)
      const updatedData = menulist.filter(
        (item) => item.baseConfigId !== baseConfigId
      )
      setMenulist(updatedData)
    }
  }
  const renderComponent = () => {
    return (
      <Tabs
        value={tabValue}
        className="flex flex-col"
        onValueChange={setTabValue}
      >
        <TabsList className="flex   flex-row items-start justify-start overflow-x-auto">
          {pageDataArray.map((item, index) => {
            return (
              <TabsTrigger
                value={item.service}
                key={index}
                className="w-auto justify-start"
              >
                <div className="relative flex flex-row items-center justify-center gap-1 px-10">
                  <div className="flex flex-row items-start justify-start gap-1">
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
            <TabsContent
              key={item.service}
              value={item.service}
              className="grow"
            >
              {item.render}
            </TabsContent>
          )
        })}
      </Tabs>
    )
  }
  return (
    <>
      <SidebarContext.Provider
        value={{
          handleAddPageClick,
          setShowQueryLoading,
          setQueryName,
          setBaseConfigId,
          setNodeForUpdate,
          setShowDeleteConnectionDialog,
        }}
      >
        <div
          className="grid h-full max-h-full  grid-cols-10 divide-x divide-foreground/30  overflow-x-auto  overflow-y-auto "
          onContextMenu={(e) => {
            console.log(e)
            if (typeof document.hasFocus === "function" && !document.hasFocus())
              return
            e.preventDefault()
            setAnchorPoint({ x: e.clientX, y: e.clientY })
            setOpen(true)
          }}
        >
          <ControlledMenu
            anchorPoint={anchorPoint}
            state={isOpen ? "open" : "closed"}
            direction="right"
            onClose={() => setOpen(false)}
          >
            <MenuItem onClick={() => window.location.reload()}>
              Refresh
            </MenuItem>
          </ControlledMenu>
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
          <Dialog
            open={showDeleteConnectionDialog}
            onOpenChange={setShowDeleteConnectionDialog}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this connection?
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
                      onClick={handleDeleteConnectionClick}
                    >
                      Delete
                    </Button>
                  </div>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sidebar menuList={menulist} />
          <div className="col-span-8">{renderComponent()}</div>
        </div>
      </SidebarContext.Provider>
    </>
  )
}
export default DashboardPage
