export function getRootNode(node) {
  let tempNode = node
  while (tempNode.level > 0) {
    tempNode = tempNode.parent
  }
  return tempNode
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
export function getAlterColumnSql(node, tableName, column, description) {
  let mysqlAlterColumn = `ALTER TABLE \`${tableName}\` 
	CHANGE \`${column}\` \`${column}\` ${description} DEFAULT NULL ;`
  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlAlterColumn
  } else return null
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
  let sqlLiteCreateColumn = `CREATE INDEX ${tableName}_ ON ${tableName}(\`\`)`
  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlCreateColumn
  } else if (rootNode.data.connectionType === 3) {
    return sqlLiteCreateColumn
  }
}
export function getCreateIndexForColumn(node, tableName) {
  console.log(node, tableName)
  let mysqlCreateColumn = `ALTER TABLE ${tableName} ADD key (\`${node.data.name}\`)`
  let sqlLiteCreateColumn = `CREATE INDEX ${tableName}_ ON ${tableName}`

  let rootNode = getRootNode(node)
  if (rootNode.data.connectionType === 0) {
    return mysqlCreateColumn
  } else if (rootNode.data.connectionType === 3) {
    return sqlLiteCreateColumn
  }
}