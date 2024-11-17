import React, { useContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Tree } from "react-arborist"
import { useTranslation } from "react-i18next"
import useResizeObserver from "use-resize-observer"

import { useToast } from "@/components/ui/use-toast"

import { SidebarContext } from "../page"
import IconDiv from "./iconDiv"
import TreeNode from "./treeNode"

const treeNode = ({
  node,
  style,
  dragHandle,
  toggleRowSelection,
  selectedRows,
}) => {
  console.log(node)
  return (
    <TreeNode
      node={node}
      style={style}
      key={node.data.id}
      dragHandle={dragHandle}
      toggleRowSelection={toggleRowSelection}
      selectedRows={selectedRows}
    />
  )
}
const Sidebar = ({ treeRef }) => {
  // const treeRef = useRef()
  const { ref, width, height } = useResizeObserver()

  const { menulist, setMenulist } = useContext(SidebarContext)
  const [selectedRows, setSelectedRows] = useState({})

  // Toggle selection for a specific row
  const toggleRowSelection = (node) => {
    setSelectedRows((prevSelectedRows) => ({
      [node.id]: !prevSelectedRows[node.id],
    }))
  }
  useEffect(() => {}, [menulist])
  const { t, i18n } = useTranslation()
  const { toast } = useToast()

  return (
    <div className={" top-0  col-span-2  flex h-full "} ref={ref}>
      <Tree
        data={menulist}
        ref={treeRef}
        width={"100%"}
        className=" scrollbar"
        indent={10}
        height={height - 5}
      >
        {(props) =>
          treeNode({
            ...props,
            toggleRowSelection,
            selectedRows,
          })
        }
      </Tree>
    </div>
  )
}
export default Sidebar
