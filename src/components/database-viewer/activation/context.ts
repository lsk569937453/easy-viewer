import type { ReactNode } from "react";
import type { ConnectionSummary } from "../../../types/backend";
import type { SetActiveTabId, SetTabs, Tab } from "../../../types/tab";
import type { TreeNode } from "../../../types/tree";

/** 激活节点时需要的 tab 状态与操作。 */
export interface ActivationTabContext {
  tabs: Tab[];
  setTabs: SetTabs;
  setActiveTabId: SetActiveTabId;
}

/** 激活节点时需要的完整上下文（由 useTabActions 统一提供）。 */
export interface NodeActivationContext extends ActivationTabContext {
  connections: ConnectionSummary[];
  openSqlEditorTabWithContent: (
    connectionId: number,
    nodeIcon: ReactNode,
    generatedSql?: string,
    defaultName?: string,
    databaseName?: string,
  ) => Promise<boolean>;
  handleToggleNode: (node: TreeNode) => Promise<void>;
}

/** 已经解析出连接后的节点激活参数。 */
export interface NodeActivationArgs extends NodeActivationContext {
  node: TreeNode;
  connection: ConnectionSummary;
}

/** 命中已有 tab 就激活，否则创建新 tab 并激活。 */
export const activateTab = (
  context: ActivationTabContext,
  existing: Tab | undefined,
  createTab: () => Tab,
): void => {
  if (existing) {
    context.setActiveTabId(existing.id);
    return;
  }
  const newTab = createTab();
  context.setTabs((prevTabs) => [...prevTabs, newTab]);
  context.setActiveTabId(newTab.id);
};

/** 按 id 命中已有 tab，否则创建。 */
export const activateTabById = (
  context: ActivationTabContext,
  tabId: string,
  createTab: () => Tab,
): void => {
  const existing = context.tabs.find((tab) => tab.id === tabId);
  activateTab(context, existing, createTab);
};
