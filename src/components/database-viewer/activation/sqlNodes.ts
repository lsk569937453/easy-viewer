import type { Tab } from "../../../types/tab";
import type { TreeNode } from "../../../types/tree";
import { generateSqlForNode } from "../generateSqlForNode";
import {
  activateTab,
  activateTabById,
  type NodeActivationArgs,
} from "./context";

/** 已保存查询：打开（或复用）对应 SQL 编辑器 tab。 */
export const activateSavedQueryNode = async ({
  node,
  connection,
  tabs,
  setActiveTabId,
  ...context
}: NodeActivationArgs): Promise<void> => {
  const queryId = node.path[node.path.length - 1].config_value;
  const databaseName = node.path[1]?.config_value || "";
  const newTabId = `sql-editor-${queryId}`;

  const existingSqlEditorTab = tabs.find(
    (tab) => tab.type === "sqlEditor" && tab.queryId === queryId,
  );
  activateTab(
    { tabs, setActiveTabId, ...context },
    existingSqlEditorTab,
    () => {
      return {
        id: newTabId,
        name: node.name,
        icon: node.icon,
        type: "sqlEditor",
        connectionId: connection.base_config_id,
        queryId: queryId,
        databaseName: databaseName,
        initialSql: null,
        isDirty: false,
        // 该分支的 tab 没有 node 对象，用 sourceNodeId 支撑树的选中高亮
        sourceNodeId: node.id,
      };
    },
  );
};

const buildSingleTableTab = (
  node: TreeNode,
  connection: NodeActivationArgs["connection"],
  tabId: string,
  sql: string,
): Tab => ({
  id: tabId,
  name: node.name,
  icon: node.icon,
  details: sql,
  iconName: node.iconName,
  path: node.path,
  type: "singleTable",
  initialSql: sql,
  node: node,
  connectionDetails: connection,
});

/** 普通数据库表：打开（或复用）单表 SQL tab，并切换展开态。 */
export const activateSingleTableNode = async (args: NodeActivationArgs) => {
  const { node, connections } = args;
  const tableId = node.path[node.path.length - 1].config_value;
  const newTabId = `singleTable-${tableId}`;
  const existingSqlEditorTab = args.tabs.find(
    (tab) => tab.type === "singleTable" && tab.id === newTabId,
  );

  if (existingSqlEditorTab) {
    args.setActiveTabId(existingSqlEditorTab.id);
  } else {
    const sql = generateSqlForNode(node, connections);
    const newTab = buildSingleTableTab(node, args.connection, newTabId, sql);
    args.setTabs((prevTabs) => [...prevTabs, newTab]);
    args.setActiveTabId(newTab.id);
  }
  // 表节点同时切换展开/折叠
  await args.handleToggleNode(node);
};

/** 索引节点：打开（或复用）索引详情 tab。 */
export const activateIndexNode = async ({
  node,
  tabs,
  setActiveTabId,
  ...context
}: NodeActivationArgs): Promise<void> => {
  const tableName = node.path[3]?.config_value;
  const indexName = node.name;
  const newTabId = `index-${node.id}`;

  activateTabById({ tabs, setActiveTabId, ...context }, newTabId, () => ({
    id: newTabId,
    name: indexName,
    icon: node.icon,
    details: `索引: ${indexName}`,
    type: "indexDetail",
    node: node,
    tableName: tableName,
  }));
};

/** 列 / 主键节点：打开（或复用）列详情 tab。 */
export const activateColumnNode = async ({
  node,
  tabs,
  setActiveTabId,
  ...context
}: NodeActivationArgs): Promise<void> => {
  const columnName = node.name;
  const tableName = node.path[node.path.length - 3]?.config_value;
  const newTabId = `column-${node.id}`;

  activateTabById({ tabs, setActiveTabId, ...context }, newTabId, () => ({
    id: newTabId,
    name: columnName,
    icon: node.icon,
    details: `列: ${columnName}`,
    type: "columnDetail",
    node: node,
    tableName: tableName,
    iconName: node.iconName,
  }));
};

/** Columns 文件夹：打开所属表的列信息详情页，并切换展开态。 */
export const activateColumnsFolderNode = async (
  args: NodeActivationArgs,
): Promise<void> => {
  const { node } = args;
  const tableName = node.path[node.path.length - 2]?.config_value;
  const tabId = `columns-detail-${node.id}`;

  activateTabById(args, tabId, () => ({
    id: tabId,
    name: `${tableName} - 列信息`,
    icon: node.icon,
    type: "tableDetail",
    node: node,
    defaultTab: "column",
  }));
  await args.handleToggleNode(node);
};
