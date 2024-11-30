import { createContext, useContext, useEffect, useRef, useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { ControlledMenu, MenuItem } from "@szhsin/react-menu"
import useResizeObserver from "use-resize-observer"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { SidebarContext } from "../page"

const TabsComponent = () => {
  const [tabMenuAnchorPoint, settabMenuAnchorPoint] = useState({ x: 0, y: 0 })
  const [isTabContextMenuOpen, setIsTabContextMenuOpen] = useState(false)
  const [contextMenuTabIndex, setContextMenuTabIndex] = useState(null)
  const [tabWidth, setTabWidth] = useState(192)
  const rowRef = useRef(null)

  const {
    tabValue,
    setTabValue,
    pageDataArray,
    tabsState,
    setTabsState,
    setPageDataArray,
    handleRemoveTabButton,
    handleRemoveWithoutSaveButtonClick,
  } = useContext(SidebarContext)

  useEffect(() => {
    const adjustWidths = () => {
      if (!rowRef.current) return
      const containerWidth = rowRef.current.offsetWidth
      const elements = rowRef.current.children

      const totalElementsWidth = Array.from(elements).reduce(
        (acc, el) => acc + el.offsetWidth,
        0
      )

      const wid = containerWidth / pageDataArray.length
      console.log(wid)
      if (wid < 192) {
        setTabWidth(wid)
      } else {
        setTabWidth(192)
      }
    }
    console.log(pageDataArray)
    adjustWidths()
    window.addEventListener("resize", adjustWidths)
    return () => window.removeEventListener("resize", adjustWidths)
  }, [pageDataArray])
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
    const isEdited = tabsState.includes(contextMenuTabIndex)

    const retainedTab = pageDataArray[contextMenuTabIndex]
    setPageDataArray([retainedTab])
    setTabValue(retainedTab.service)
    setTabsState(() => (isEdited ? [0] : [])) // The retained tab is now at index 0
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

    const tabsToRemoveCount = contextMenuTabIndex

    setTabsState(
      (prevState) =>
        prevState
          .filter((index) => index >= contextMenuTabIndex) // Keep only valid indices
          .map((index) => index - tabsToRemoveCount) // Adjust remaining indices
    )
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
    setTabsState((prevState) =>
      prevState.filter((index) => index <= contextMenuTabIndex)
    )
  }
  const handleCloseAllTabs = () => {
    setPageDataArray([])
    setTabValue(undefined)
    setTabsState([])
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
          Close Others Without Save
        </MenuItem>
        <MenuItem onClick={handleCloseTabToLeft} className="text-sm">
          Close Tabs to the Left Without Save
        </MenuItem>
        <MenuItem onClick={handleCloseTabToRight} className="text-sm">
          Close Tabs to the right Without Save
        </MenuItem>
        <MenuItem onClick={handleCloseAllTabs} className="text-sm">
          Close All Without Save
        </MenuItem>
      </ControlledMenu>
      <TabsList
        className=" flex h-10 flex-row items-start justify-start bg-background"
        ref={rowRef}
      >
        {pageDataArray.map((item, index) => {
          return (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger className="h-full ">
                  <TabsTrigger
                    value={item.service}
                    key={index}
                    className="justify-start hover:bg-muted/40 data-[state=active]:bg-muted "
                    style={{
                      width: `${tabWidth}px`,
                    }}
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
                    <div className="flex w-full flex-row items-start justify-start gap-1 p-2">
                      <div className="flex-none"> {item.icon}</div>
                      {tabWidth > 70 && (
                        <p className="grow-0 overflow-hidden text-ellipsis pr-6">
                          {" "}
                          {item.tabName}
                        </p>
                      )}
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
                  </TabsTrigger>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="text-violet11 data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
                    sideOffset={5}
                  >
                    <p> {item.tabName}</p>
                    <Tooltip.Arrow className="fill-muted" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )
        })}
      </TabsList>
      {pageDataArray.map((item, index) => {
        return (
          <TabsContent
            key={item.service}
            value={item.service}
            className="h-full w-full overflow-hidden bg-background"
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
