import { activateTabById, type NodeActivationArgs } from "./context";

/** S3 / WebDAV 文件或文件夹节点：打开对象 tab，并切换展开态。 */
export const activateS3ObjectNode = async ({
  node,
  ...context
}: NodeActivationArgs): Promise<void> => {
  const tabId = `s3-object-${node.id}`;

  activateTabById(context, tabId, () => ({
    id: tabId,
    name: node.name,
    icon: node.icon,
    type: "s3Object",
    node: node,
  }));
  await context.handleToggleNode(node);
};
