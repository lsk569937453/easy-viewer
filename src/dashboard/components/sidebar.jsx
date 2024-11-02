import React, { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Tree } from "react-arborist"
import { useTranslation } from "react-i18next"
import useResizeObserver from "use-resize-observer"

import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos, uuid } from "../../lib/utils"
import IconDiv from "./iconDiv"
import TreeNode from "./treeNode"

const treeNode = ({
  node,
  style,
  dragHandle,
  handleAddPageClick,
  setCurrentMenuList,
  currentMenuList,
  setShowQueryLoading,
  setQueryName,
}) => {
  return (
    <TreeNode
      node={node}
      style={style}
      dragHandle={dragHandle}
      handleAddPageClick={handleAddPageClick}
      setCurrentMenuList={setCurrentMenuList}
      currentMenuList={currentMenuList}
      setShowQueryLoading={setShowQueryLoading}
      setQueryName={setQueryName}
    />
  )
}
const Sidebar = ({
  menuList,
  handleAddPageClick,
  setShowQueryLoading,
  setQueryName,
}) => {
  const treeRef = useRef()
  const { ref, width, height } = useResizeObserver()

  const [currentMenuList, setCurrentMenuList] = useState([])

  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  useEffect(() => {
    console.log(menuList)
    setCurrentMenuList(menuList)
  }, [menuList])

  return (
    <div
      className={
        "top-0 col-span-2  flex  h-full overflow-y-auto  overscroll-x-none"
      }
      ref={ref}
    >
      <Tree
        data={currentMenuList}
        ref={treeRef}
        width={"100%"}
        className="overflow-y-auto overscroll-x-none "
        indent={10}
        height={height}
      >
        {(props) =>
          treeNode({
            ...props,
            handleAddPageClick,
            setCurrentMenuList,
            currentMenuList,
            setShowQueryLoading,
            setQueryName,
          })
        }
      </Tree>
    </div>
  )
}
export default Sidebar
