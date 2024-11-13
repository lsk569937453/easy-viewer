import { Description } from "@radix-ui/react-dialog"
import { invoke } from "@tauri-apps/api/core"

import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos, uuid } from "./jsx-utils"

export const findParentNode = (node) => {
  let temNode = node
  while (temNode.level !== 0) {
    temNode = temNode.parent
  }
  return temNode
}
export const findAndReplaceChildren = (data, targetId, newChildren) => {
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
export const showFirstIcon = (node, item) => {
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
    if (response_msg.list.length === 0) {
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
      newChildren = response_msg.list.map((item) => ({
        id: item.id,
        name: item.name,
        iconName: item.icon_name,
        description: item.description,
        showFirstIcon: item.show_first_icon,
        showSecondIcon: item.show_second_icon,
      }))
    }

    findAndReplaceChildren(currentMenuList, node.data.id, newChildren)
    setCurrentMenuList([...currentMenuList])
  }
  return { response_code, response_msg }
}
