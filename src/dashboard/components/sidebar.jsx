import React, { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Tree } from "react-arborist"
import { useTranslation } from "react-i18next"
import useResizeObserver from "use-resize-observer"

import { useToast } from "@/components/ui/use-toast"

import IconDiv from "./iconDiv"
import TreeNode from "./treeNode"

const treeNode = ({
  node,
  style,
  dragHandle,
  setCurrentMenuList,
  currentMenuList,
  toggleRowSelection,
  selectedRows,
}) => {
  return (
    <TreeNode
      node={node}
      style={style}
      dragHandle={dragHandle}
      setCurrentMenuList={setCurrentMenuList}
      currentMenuList={currentMenuList}
      toggleRowSelection={toggleRowSelection}
      selectedRows={selectedRows}
    />
  )
}
const Sidebar = ({ menuList, treeRef }) => {
  // const treeRef = useRef()
  const { ref, width, height } = useResizeObserver()

  const [currentMenuList, setCurrentMenuList] = useState([])
  const [selectedRows, setSelectedRows] = useState({})

  // Toggle selection for a specific row
  const toggleRowSelection = (node) => {
    setSelectedRows((prevSelectedRows) => ({
      [node.id]: !prevSelectedRows[node.id],
    }))
  }
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  useEffect(() => {
    setCurrentMenuList(menuList)
  }, [menuList])

  return (
    <div className={" top-0  col-span-2  flex h-full "} ref={ref}>
      <Tree
        data={currentMenuList}
        ref={treeRef}
        width={"100%"}
        className=" scrollbar"
        indent={10}
        height={height - 5}
      >
        {(props) =>
          treeNode({
            ...props,
            setCurrentMenuList,
            currentMenuList,
            toggleRowSelection,
            selectedRows,
          })
        }
      </Tree>
    </div>
  )
}
export default Sidebar
