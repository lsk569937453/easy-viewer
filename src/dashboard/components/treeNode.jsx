import React, { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

import { getLevelInfos, uuid } from "../../lib/utils"
import TablePage from "../page/tablePage.jsx"
import IconDiv from "./iconDiv.jsx"

const mysqlDatabaseData = [
  {
    name: "Query",
    iconName: "query",
  },
  {
    name: "Tables",
    iconName: "tables",
  },
  {
    name: "Views",
    iconName: "views",
  },
  {
    name: "Functions",
    iconName: "functions",
  },
  {
    name: "Procedures",
    iconName: "procedures",
  },
]
const mysqlTableData = [
  {
    name: "Columns",
    iconName: "columns",
  },
  {
    name: "Index",
    iconName: "index",
  },
  {
    name: "Partitions",
    iconName: "partitions",
  },
]
const TreeNode = ({
  node,
  style,
  dragHandle,
  handleAddPageClick,
  setCurrentMenuList,
  currentMenuList,
  setShowQueryLoading,
  setQueryName,
}) => {
  //it is used to trggger the child event
  // const [trigger, setTrigger] = useState(false);
  const findParentNode = (node) => {
    let temNode = node
    while (temNode.level !== 0) {
      temNode = temNode.parent
    }
    return temNode
  }
  const findAndReplaceChildren = (data, targetId, newChildren) => {
    for (let item of data) {
      if (item.id === targetId) {
        item.children = newChildren
        return true
      }
      if (item.children) {
        const found = findAndReplaceChildren(
          item.children,
          targetId,
          newChildren
        )
        if (found) {
          return true
        }
      }
    }
    return false
  }
  const clickNode = async (node) => {
    console.log(node)
    //if the parent node is mysql
    if (node.level == 1 && node.parent.data.connectionType == 0) {
      const newChildren = mysqlDatabaseData.map((item, index) => {
        return {
          id: uuid(),
          name: item.name,
          iconName: item.iconName,
          showFirstIcon: true,
          showSecondIcon: true,
        }
      })
      findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
      setCurrentMenuList([...currentMenuList])
      return
    } else if (
      node.level == 3 &&
      findParentNode(node).data.connectionType == 0
    ) {
      const newChildren = mysqlTableData.map((item, index) => {
        return {
          id: uuid(),
          name: item.name,
          iconName: item.iconName,
          showFirstIcon: true,
          showSecondIcon: true,
        }
      })
      findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
      setCurrentMenuList([...currentMenuList])
      return
    }

    console.log(node)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    console.log(listNodeInfoReq)
    const { response_code, response_msg } = JSON.parse(
      await invoke("list_node_info", { listNodeInfoReq: listNodeInfoReq })
    )

    console.log(response_code)
    console.log(response_msg)

    let newChildren
    if (response_msg.length == 0) {
      newChildren = [
        {
          id: uuid(),
          name: "No Data",
          iconName: "",
          showFirstIcon: false,
          showSecondIcon: false,
        },
      ]
    } else {
      newChildren = response_msg.map((item, index) => {
        return {
          id: uuid(),
          name: item[0],
          iconName: item[1],
          showFirstIcon: node.level == 4 ? false : true,
          showSecondIcon: true,
        }
      })
    }
    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
  }
  const handleClickIcon = (node) => {
    addTab()
    if (node.children && node.children.length > 0) {
      node.isInternal && node.toggle()
    } else {
      clickNode(node)
    }
  }
  const addTab = () => {
    console.log(node.data.iconName === "singleTable")
    if (node.data.iconName === "singleTable") {
      handleAddPageClick({
        name: "table",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-border-all"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
            <path d="M4 12l16 0" />
            <path d="M12 4l0 16" />
          </svg>
        ),
        render: <TablePage node={node} />,
        service: node.data.name,
      })
    }
  }
  return (
    <div
      style={style}
      ref={dragHandle}
      className="group/item flex cursor-pointer flex-row content-center items-center justify-items-center  gap-2 p-1 hover:bg-slate-200"
      onClick={() => (node.data.showFirstIcon ? handleClickIcon(node) : null)}
    >
      {node.data.showFirstIcon && node.isOpen && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M6 9l6 6l6 -6" />
        </svg>
      )}
      {node.data.showFirstIcon && !node.isOpen && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M9 6l6 6l-6 6" />
        </svg>
      )}
      <IconDiv
        node={node}
        setShowQueryLoading={setShowQueryLoading}
        setQueryName={setQueryName}
      />
    </div>
  )
}

export default TreeNode
