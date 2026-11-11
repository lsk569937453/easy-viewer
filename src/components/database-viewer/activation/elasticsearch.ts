import { activateTabById, type NodeActivationArgs } from "./context";

/** Elasticsearch index 节点（singleTable + connection_type=10）。 */
export const activateElasticsearchNode = async (
  args: NodeActivationArgs,
): Promise<void> => {
  const { node, connection } = args;

  if (node.iconName === "singleTable") {
    const tabId = `es-index-${node.id}`;
    activateTabById(args, tabId, () => ({
      id: tabId,
      name: node.name,
      icon: node.icon,
      type: "esIndexBrowser",
      node: node,
      connectionDetails: connection,
    }));
    await args.handleToggleNode(node);
    return;
  }

  // 默认展开/折叠
  await args.handleToggleNode(node);
};
