import { createContext, useEffect, useRef, useState } from "react"
import { Menu } from "@/dashboard/menu/menu"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"
import { invoke } from "@tauri-apps/api/core"
// import { IconMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu"
import { set } from "date-fns"
import { useTranslation } from "react-i18next"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { reloadNode } from "../lib/jsx-utils"
import { cn } from "../lib/utils"
import { CreateLinkDialog } from "./menu/createLinkDialog"

import "@szhsin/react-menu/dist/index.css"

import { event, menu } from "@tauri-apps/api"

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
import { useToast } from "@/components/ui/use-toast"

import { getIconNameByType, uuid } from "../lib/jsx-utils"
import { clickNode } from "../lib/node"
import Sidebar from "./components/sidebar"
import TabsComponent from "./components/tabsComponent"

export const SidebarContext = createContext({
  handleAddPageClick: () => {},
  setShowQueryLoading: () => {},
  setQueryName: () => {},
  setNewQueryName: () => {},
  setBaseConfigId: () => {},
  setNodeForUpdate: () => {},
  setShowDeleteConnectionDialog: () => {},
  setShowEditConnectionDialog: () => {},
  setIsSave: () => {},
  setShowSaveQueryDialog: () => {},
  handleRemoveTabButton: () => {},
  setTabsState: () => {},
  setShowRenameQueryDialog: () => {},
  setShowRemoveQueryDialog: () => {},
  tabValue: {},
  setTabValue: () => {},
  pageDataArray: [],
  event: {},
  tabsState: [],
  menulist: [],
  setMenulist: () => {},
  setPageDataArray: () => {},
  handleRemoveWithoutSaveButtonClick: () => {},
  treeRef: {},
  setConnectionType: () => {},
})
export const CreateConnectionDialogContext = createContext({})
const DashboardPage = () => {
  const { t, i18n } = useTranslation()
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 })
  const treeRef = useRef()
  const { toast } = useToast()

  const [menulist, setMenulist] = useState([])
  const [connectionType, setConnectionType] = useState("mysql")
  const [pageDataArray, setPageDataArray] = useState([])
  const [tabValue, setTabValue] = useState(null)
  const [showQueryLoading, setShowQueryLoading] = useState(false)
  const [showDeleteConnectionDialog, setShowDeleteConnectionDialog] =
    useState(false)
  const [showRemoveQueryDialog, setShowRemoveQueryDialog] = useState(false)
  const [showSaveQueryDialog, setShowSaveQueryDialog] = useState(false)
  const [showRenameQueryDialog, setShowRenameQueryDialog] = useState(false)
  const [saveQueryTabIndex, setSaveQueryTabIndex] = useState(0)
  const [event, setEvent] = useState({})
  const [queryName, setQueryName] = useState("")
  const [newQueryName, setNewQueryName] = useState("")
  const [baseConfigId, setBaseConfigId] = useState(null)
  const [nodeForUpdate, setNodeForUpdate] = useState(null)
  const [isOpen, setOpen] = useState(false)
  const [showEditConnectionDialog, setShowEditConnectionDialog] =
    useState(false)
  const [isSave, setIsSave] = useState(true)
  const [tabsState, setTabsState] = useState([])

  useEffect(() => {
    loadData()
  }, [])
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
          iconName: getIconNameByType(item.connection_type),
          showFirstIcon: true,
          showSecondIcon: true,
          key: index,
          id: uuid(),
          name: item.connection_name,
          baseConfigId: item.base_config_id,
          description: item.description,
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

  const handleRemoveWithoutSaveButtonClick = (index) => {
    setShowSaveQueryDialog(true)
    setSaveQueryTabIndex(index)
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
  const handleQueryRenameClick = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("rename_query", {
        connectionId: Number(baseConfigId),
        oldQueryName: queryName,
        newQueryName: newQueryName,
      })
    )
    if (response_code == 0) {
      console.log("rename_query success")
      setShowRenameQueryDialog(false)
      clickNode(nodeForUpdate, menulist, setMenulist)
      const updatedArray = pageDataArray.map((item) => {
        if (item.service === queryName) {
          return { ...item, tabName: newQueryName }
        }
        return item
      })
      setPageDataArray(updatedArray)
      setQueryName(newQueryName)
    } else {
      toast({
        variant: "destructive",
        title: "操作信息",
        description: response_msg,
      })
    }
    setShowRenameQueryDialog(false)
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
  const handleRemoveTabButton = (index) => {
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
  const handleRmoveQueryClick = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("remove_query", {
        baseConfigId: Number(baseConfigId),
        queryName: queryName,
      })
    )
    if (response_code == 0) {
      console.log("删除成功")
      setShowRemoveQueryDialog(false)
      clickNode(nodeForUpdate, menulist, setMenulist)
    }
  }
  const handleSaveQueryButtonClick = async () => {
    setEvent({
      type: 0,
      index: saveQueryTabIndex,
    })
  }
  const handleCancelQueryButtonClick = () => {
    setEvent({
      type: 1,
      index: saveQueryTabIndex,
    })
  }

  const handleNewConnectionButtonClick = () => {
    setShowEditConnectionDialog(true)
    setBaseConfigId(null)
    setIsSave(false)
  }
  return (
    <>
      <SidebarContext.Provider
        value={{
          handleAddPageClick,
          setShowQueryLoading,
          setQueryName,
          setNewQueryName,
          setBaseConfigId,
          setNodeForUpdate,
          setShowDeleteConnectionDialog,
          setShowEditConnectionDialog,
          setIsSave,
          event,
          setShowSaveQueryDialog,
          handleRemoveTabButton,
          setTabsState,
          setShowRenameQueryDialog,
          setShowRemoveQueryDialog,
          tabValue,
          setTabValue,
          tabsState,
          pageDataArray,
          setPageDataArray,
          handleRemoveWithoutSaveButtonClick,
          menulist,
          setMenulist,
          treeRef,
          setConnectionType,
        }}
      >
        <div className="flex h-screen flex-col overflow-hidden ">
          <Menu className="flex-none" />
          <div
            className={cn(
              "h-full w-full border-t border-foreground/30 bg-background pb-1",
              "scrollbar scrollbar-track-transparent scrollbar-thumb-accent scrollbar-thumb-rounded-md"
            )}
          >
            <ResizablePanelGroup
              direction="horizontal"
              onContextMenu={(e) => {
                console.log(e)
                if (
                  typeof document.hasFocus === "function" &&
                  !document.hasFocus()
                )
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
                className="p-1"
              >
                <MenuItem
                  onClick={handleNewConnectionButtonClick}
                  className="text-sm"
                >
                  New Connection
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    reloadNode(treeRef.current.root, menulist, setMenulist)
                  }
                  className="text-sm"
                >
                  Refresh
                </MenuItem>
              </ControlledMenu>
              <ResizablePanel defaultSize={25} className=" min-w-[200px]">
                <Dialog
                  open={showEditConnectionDialog}
                  onOpenChange={setShowEditConnectionDialog}
                >
                  <CreateLinkDialog
                    baseCongfigId={baseConfigId}
                    isSave={isSave}
                    isOpen={showEditConnectionDialog}
                    connectionType={connectionType}
                  />
                </Dialog>
                <Dialog
                  open={showQueryLoading}
                  onOpenChange={setShowQueryLoading}
                >
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
                  open={showRenameQueryDialog}
                  onOpenChange={setShowRenameQueryDialog}
                >
                  <DialogContent className="w-30 bg-slate-200">
                    <DialogTitle>Rename Query</DialogTitle>
                    <div className="flex flex-col gap-4 p-4">
                      <div className="flex flex-row items-center justify-center">
                        <p className="flex-[1]">Name:</p>
                        <input
                          className="flex h-10 w-full flex-[3] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  disabled:cursor-not-allowed disabled:opacity-50"
                          value={newQueryName}
                          onChange={(e) => setNewQueryName(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleQueryRenameClick}> Rename</Button>
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
                <Dialog
                  open={showRemoveQueryDialog}
                  onOpenChange={setShowRemoveQueryDialog}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Delete</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this query?
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
                            onClick={handleRmoveQueryClick}
                          >
                            Delete
                          </Button>
                        </div>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={showSaveQueryDialog}
                  onOpenChange={setShowSaveQueryDialog}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Save Query</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to save the query?
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="sm:justify-end">
                      <DialogClose asChild>
                        <div className="flex flex-row items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCancelQueryButtonClick}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveQueryButtonClick}
                          >
                            Save
                          </Button>
                        </div>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Sidebar menuList={menulist} treeRef={treeRef} />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={75} className="min-w-[200px]">
                <div className="col-span-8 h-full w-full">
                  {pageDataArray.length > 0 ? <TabsComponent /> : ""}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </SidebarContext.Provider>
    </>
  )
}
export default DashboardPage
