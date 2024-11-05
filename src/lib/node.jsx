import { invoke } from "@tauri-apps/api/core"

import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos, uuid } from "./utils"

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
const sqliteRootData = [
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
]
const sqliteTableData = [
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
      const found = findAndReplaceChildren(item.children, targetId, newChildren)
      if (found) {
        return true
      }
    }
  }
  return false
}
const showFirstIcon = (node, item) => {
  let flag = true
  if (node.level === 4) {
    flag = false
  } else if (item[1] === "singleQuery") {
    flag = false
  } else if (item[1] === "column" || item[1] === "primary") {
    flag = false
  }
  return flag
}
export const clickNode = async (node, currentMenuList, setCurrentMenuList) => {
  console.log(node)

  // Check if the parent node is MySQL
  if (node.level == 1 && node.parent.data.connectionType == 0) {
    const newChildren = mysqlDatabaseData.map((item) => ({
      id: uuid(),
      name: item.name,
      iconName: item.iconName,
      showFirstIcon: true,
      showSecondIcon: true,
    }))
    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
    return { response_code: 0, response_msg: "success" }
  } else if (node.level == 3 && findParentNode(node).data.connectionType == 0) {
    const newChildren = mysqlTableData.map((item) => ({
      id: uuid(),
      name: item.name,
      iconName: item.iconName,
      showFirstIcon: true,
      showSecondIcon: true,
    }))
    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
    return { response_code: 0, response_msg: "success" }
    // Check if the node is SQLite
  } else if (node.level == 0 && node.data.connectionType == 3) {
    const newChildren = sqliteRootData.map((item) => ({
      id: uuid(),
      name: item.name,
      iconName: item.iconName,
      showFirstIcon: true,
      showSecondIcon: true,
    }))
    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
    return { response_code: 0, response_msg: "success" }
  } else if (node.level == 2 && findParentNode(node).data.connectionType == 3) {
    const newChildren = sqliteTableData.map((item) => ({
      id: uuid(),
      name: item.name,
      iconName: item.iconName,
      showFirstIcon: true,
      showSecondIcon: true,
    }))
    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
    return { response_code: 0, response_msg: "success" }
  }

  console.log(node)
  const listNodeInfoReq = {
    level_infos: getLevelInfos(node),
  }
  console.log(listNodeInfoReq)

  const { response_code, response_msg } = JSON.parse(
    await invoke("list_node_info", { listNodeInfoReq })
  )

  console.log(response_code)
  console.log(response_msg)

  if (response_code === 0) {
    let newChildren
    if (response_msg.length === 0) {
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
      newChildren = response_msg.map((item) => ({
        id: uuid(),
        name: item[0],
        iconName: item[1],
        showFirstIcon: showFirstIcon(node, item),
        showSecondIcon: true,
      }))
    }

    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
  }
  return { response_code, response_msg }
}
