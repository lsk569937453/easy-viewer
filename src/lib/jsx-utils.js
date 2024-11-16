import { invoke } from "@tauri-apps/api/core"

import { findAndReplaceChildren, findParentNode, showFirstIcon } from "./node"

export function formatDate(input) {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
export function absoluteUrl(path) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}
export function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
export function highlightSQL(sql) {
  const keywords =
    /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|DELETE|UPDATE|JOIN|ON|AND|OR|NOT|NULL|AS|LIKE|GROUP BY|ORDER BY|LIMIT|OFFSET|HAVING|COUNT|SUM|AVG|MIN|MAX|DISTINCT|UNION|ALL|CREATE|TABLE|PRIMARY|KEY|FOREIGN|CONSTRAINT|ALTER|ADD|DROP|DEFAULT|CHECK)\b/gi
  const strings = /('[^']*'|"[^"]*")/g
  const numbers = /\b\d+(\.\d+)?\b/g
  const operators = /(\*|=|<>|<|>|\+|-|\/|%)/g

  return sql
    .replace(keywords, '<span class="text-blue-400 font-bold">$&</span>')
    .replace(strings, '<span class="text-pink-400">$&</span>')
    .replace(numbers, '<span class="text-green-400">$&</span>')
    .replace(operators, '<span class="text-purple-400">$&</span>')
}

export function getLevelInfos(node) {
  const levelInfos = []
  let tempNode = node
  for (let i = node.level; i > 0; i--) {
    levelInfos.push({ level: i, config_value: tempNode.data.name })
    tempNode = tempNode.parent
  }
  levelInfos.push({
    level: 0,
    config_value: tempNode.data.baseConfigId.toString(),
  })

  levelInfos.reverse()
  return levelInfos
}
const getInteralRootNode = (node) => {
  let tempNode = node
  while (tempNode.level > -1) {
    tempNode = tempNode.parent
  }
  return tempNode
}
const getBaseConfigById = async (baseConfigId) => {
  const { response_code, response_msg } = JSON.parse(
    await invoke("get_base_config_by_id", { baseConfigId: baseConfigId })
  )
  if (response_code === 0) {
    return {
      connectionType: response_msg.connection_type,
      iconName: getIconNameByType(response_msg.connection_type),
      name: response_msg.connection_name,
      description: response_msg.description,
    }
  } else {
    return null
  }
}
const loadRootData = async () => {
  const { response_code, response_msg } = JSON.parse(
    await invoke("get_base_config")
  )
  if (response_code == 0) {
    const rootNodeList = response_msg.base_config_list.map((item, index) => {
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
    return rootNodeList
  }
}
const findAndUpdateChildren = (currentMenuList, targetId, newChildren) => {
  const updateNodeChildren = (nodes) => {
    for (let node of nodes) {
      if (node.id === targetId) {
        if (!node.children || node.children.length === 0) {
          node.children = [...newChildren]
        } else {
          const newChildrenMap = new Map(
            newChildren.map((child) => [child.name, child])
          )
          node.children = node.children.filter((child) =>
            newChildrenMap.has(child.name)
          )
          newChildren.forEach((newChild) => {
            if (!node.children.find((child) => child.name === newChild.name)) {
              node.children.push(newChild)
            }
          })
        }
        return true // Stop once the target node is found and updated
      }
      if (node.children && updateNodeChildren(node.children)) {
        return true
      }
    }
    return false
  }

  updateNodeChildren(currentMenuList)
}
const updateNode = async (node, currentMenuList) => {
  const listNodeInfoReq = {
    level_infos: getLevelInfos(node),
  }

  const { response_code, response_msg } = JSON.parse(
    await invoke("list_node_info", { listNodeInfoReq })
  )

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

    findAndUpdateChildren(currentMenuList, node.data.id, newChildren)
  } else {
    findAndUpdateChildren(currentMenuList, node.data.id, [])
    node.close()
  }
}

const updateAllNode = async (node, updatedMenuList) => {
  const traverseAndUpdate = async (currentNode) => {
    console.log(currentNode)
    console.log("source", updatedMenuList)
    await updateNode(currentNode, updatedMenuList)
    console.log("dst", updatedMenuList)

    console.log(
      currentNode,
      currentNode.children &&
        currentNode.children.length > 0 &&
        currentNode.isOpen
    )
    if (currentNode.children && currentNode.children.length > 0) {
      for (const child of currentNode.children) {
        await traverseAndUpdate(child) // Recursively call for each child
      }
    } else {
      const findAndNullifyChildren = (nodes) => {
        for (let item of nodes) {
          if (item.id === currentNode.id) {
            item.children = null // Set children to null for matching item
            return
          }
          if (item.children && item.children.length > 0) {
            findAndNullifyChildren(item.children)
          }
        }
      }
      findAndNullifyChildren(updatedMenuList)
    }
  }
  await traverseAndUpdate(node)

  return updatedMenuList
}

export const reloadNode = async (node, currentMenuList, setCurrentMenuList) => {
  const internalNode = getInteralRootNode(node)
  let updatedMenuList = [...currentMenuList] // Create a copy of the current menu list

  for (const rootNode of internalNode.children) {
    const baseConfigId = rootNode.data.baseConfigId
    const nodeId = rootNode.data.id
    const baseConfig = await getBaseConfigById(baseConfigId)

    if (baseConfig === null) {
      updatedMenuList = updatedMenuList.filter((item) => item.id !== nodeId)
    } else {
      updatedMenuList = updatedMenuList.map((item) => {
        if (item.id === nodeId) {
          return {
            ...item,
            connectionType: baseConfig.connectionType,
            iconName: baseConfig.iconName,
            name: baseConfig.name,
            description: baseConfig.description,
          }
        }
        return item
      })
    }
    updatedMenuList = await updateAllNode(rootNode, updatedMenuList)
  }
  const rootDataList = await loadRootData()
  const internalNodeMap = new Map(
    updatedMenuList.map((child) => [child.baseConfigId, child])
  )
  for (const rootData of rootDataList) {
    if (!internalNodeMap.has(rootData.baseConfigId)) {
      updatedMenuList.push(rootData)
    }
  }

  setCurrentMenuList(updatedMenuList)
}

export function getRootNode(node) {
  let tempNode = node
  while (tempNode.level > 0) {
    tempNode = tempNode.parent
  }
  return tempNode
}
export const formatMap = new Map([
  [0, "mysql"],
  [3, "sqlite"],
  [2, "postgresql"],
])
export function getIconNameByType(params) {
  return formatMap.get(params)
}
export function getQueryName() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "")
  const queryName = `New_Query_${timestamp}`
  return queryName
}
export function getLastSQLStatement(sql) {
  // Split the SQL string by semicolons and filter out empty statements
  let statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  // Return the last statement
  return statements[statements.length - 1]
}
export function getCreateTableSql(node) {
  let mysqlCreateTable = `CREATE TABLE table_name(  
    id int NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary Key',
    create_time DATETIME COMMENT 'Create Time',
    name VARCHAR(255)
) COMMENT '';`
  let sqlLiteCreate = `CREATE TABLE table_name(  
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    content TEXT
);`
  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlCreateTable
  } else if (rootNode.data.connectionType === 3) {
    return sqlLiteCreate
  }
}
export function getCreateColumnSql(node, tableName) {
  let mysqlCreateColumn = `ALTER TABLE ${tableName} 
    ADD COLUMN  [type] COMMENT '';`
  let sqlLiteCreateColumn = `
ALTER TABLE ${tableName} 
    ADD COLUMN  [type];`
  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlCreateColumn
  } else if (rootNode.data.connectionType === 3) {
    return sqlLiteCreateColumn
  }
}
export function getCreateColumnAfterAnotherSql(node, tableName, column) {
  let mysqlCreateColumn = `ALTER TABLE ${tableName} 
    ADD COLUMN  [type] COMMENT '' AFTER \`${column}\`;`
  let sqlLiteCreateColumn = `
ALTER TABLE ${tableName} 
    ADD COLUMN  [type];`
  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlCreateColumn
  } else if (rootNode.data.connectionType === 3) {
    return sqlLiteCreateColumn
  }
}
export function getCreateIndexSql(node, tableName) {
  console.log(node, tableName)
  let mysqlCreateColumn = `ALTER TABLE ${tableName} ADD key (\`\`)`
  let sqlLiteCreateColumn = `CREATE INDEX ${tableName}_ ON ${tableName}`
  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlCreateColumn
  } else if (rootNode.data.connectionType === 3) {
    return sqlLiteCreateColumn
  }
}
export function getConnectionType(node) {
  let rootNode = getRootNode(node)
  return rootNode.data.connectionType
}
