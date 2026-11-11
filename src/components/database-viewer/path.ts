import type { TreeNode } from "../../types/tree";

/** path 以 prefix 为前缀（按 config_value 序列比较）。 */
export const isPathPrefix = (
  prefix: TreeNode["path"],
  path: TreeNode["path"],
): boolean =>
  prefix.length <= path.length &&
  prefix.every((seg, i) => seg.config_value === path[i]?.config_value);
