import { createContext, useContext, useEffect, useState } from "react"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { SidebarContext } from "../page"

const TabsComponent = () => {
  const [tabMenuAnchorPoint, settabMenuAnchorPoint] = useState({ x: 0, y: 0 })
  const [isTabContextMenuOpen, setIsTabContextMenuOpen] = useState(false)
  const [contextMenuTabIndex, setContextMenuTabIndex] = useState(null)
  const {
    tabValue,
    setTabValue,
    pageDataArray,
    tabsState,
    setPageDataArray,
    handleRemoveTabButton,
    handleRemoveWithoutSaveButtonClick,
  } = useContext(SidebarContext)
  const handleCloseTab = () => {
    handleRemoveTabButton(contextMenuTabIndex)
  }
  const handleCloseOtherTabs = () => {
    if (
      contextMenuTabIndex === undefined ||
      contextMenuTabIndex < 0 ||
      contextMenuTabIndex >= pageDataArray.length
    ) {
      return
    }
    const retainedTab = pageDataArray[contextMenuTabIndex]
    setPageDataArray([retainedTab])
    setTabValue(retainedTab.service)
  }
  const handleCloseTabToLeft = () => {
    if (
      contextMenuTabIndex === undefined ||
      contextMenuTabIndex <= 0 ||
      contextMenuTabIndex >= pageDataArray.length
    ) {
      return
    }
    const updatedPageDataArray = pageDataArray.slice(contextMenuTabIndex)
    setPageDataArray(updatedPageDataArray)
    setTabValue(updatedPageDataArray[0]?.service)
  }
  const handleCloseTabToRight = () => {
    if (
      contextMenuTabIndex === undefined ||
      contextMenuTabIndex < 0 ||
      contextMenuTabIndex >= pageDataArray.length - 1
    ) {
      return
    }

    const updatedPageDataArray = pageDataArray.slice(0, contextMenuTabIndex + 1)
    setPageDataArray(updatedPageDataArray)
    setTabValue(updatedPageDataArray[contextMenuTabIndex]?.service)
  }
  const handleCloseAllTabs = () => {
    setPageDataArray([])
    setTabValue(undefined)
  }
  return (
    <Tabs
      value={tabValue}
      className="flex h-full w-full flex-col"
      onValueChange={setTabValue}
    >
      <ControlledMenu
        anchorPoint={tabMenuAnchorPoint}
        state={isTabContextMenuOpen ? "open" : "closed"}
        direction="right"
        onClose={() => setIsTabContextMenuOpen(false)}
        portal
        className="p-1"
      >
        <MenuItem onClick={handleCloseTab} className="text-sm">
          Close
        </MenuItem>
        <MenuItem onClick={handleCloseOtherTabs} className="text-sm">
          Close Others
        </MenuItem>
        <MenuItem onClick={handleCloseTabToLeft} className="text-sm">
          Close Tabs to the Left
        </MenuItem>
        <MenuItem onClick={handleCloseTabToRight} className="text-sm">
          Close Tabs to the right
        </MenuItem>
        <MenuItem onClick={handleCloseAllTabs} className="text-sm">
          Close All
        </MenuItem>
      </ControlledMenu>
      <TabsList className="flex   flex-row items-start justify-start overflow-x-auto">
        {pageDataArray.map((item, index) => {
          return (
            <TabsTrigger
              value={item.service}
              key={index}
              className="w-auto justify-start"
              onContextMenu={(e) => {
                if (
                  typeof document.hasFocus === "function" &&
                  !document.hasFocus()
                )
                  return
                e.stopPropagation()
                e.preventDefault()
                settabMenuAnchorPoint({ x: e.clientX, y: e.clientY })
                setContextMenuTabIndex(index)
                setIsTabContextMenuOpen(true)
              }}
            >
              <div className="relative flex flex-row items-center justify-center gap-1 px-10">
                <div className="flex flex-row items-start justify-start gap-1">
                  <div className="flex-none"> {item.icon}</div>
                  <p className="grow"> {item.tabName}</p>
                </div>
                {tabsState.includes(index) && (
                  <div class="group absolute  right-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      class="icon icon-tabler icons-tabler-outline icon-tabler-x  group-hover:hidden"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      onClick={() => {
                        handleRemoveWithoutSaveButtonClick(index)
                      }}
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="icon icon-tabler icons-tabler-outline icon-tabler-x hidden group-hover:block"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M18 6l-12 12" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {!tabsState.includes(index) && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    onClick={() => {
                      handleRemoveTabButton(index)
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
                )}
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
            forceMount={true}
            hidden={item.service !== tabValue}
          >
            {item.render(index, item.tabName)}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
export default TabsComponent
