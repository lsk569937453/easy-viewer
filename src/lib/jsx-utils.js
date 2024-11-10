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
export function getRootNode(node) {
  let tempNode = node
  while (tempNode.level > 0) {
    tempNode = tempNode.parent
  }
  return tempNode
}
const formatMap = new Map([
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
