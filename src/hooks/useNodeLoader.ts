import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchServerVersion, listNodeInfo } from "../api/tree";
import { getNodeIcon } from "../components/tree/nodeIcons";
import { mapChildList, updateNodeInTree } from "../components/tree/treeModel";
import type { ListNodeInfoResponse } from "../types/backend";
import type { OpenNodes, TreeNode, TreeNodeId } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";

export interface NodeLoaderState {
  isRefreshing: boolean;
  nextLoadSeq: (nodeId: TreeNodeId) => number;
  isLatestLoad: (nodeId: TreeNodeId, seq: number) => boolean;
  fetchNodeChildren: (parentNode: TreeNode) => Promise<TreeNode[] | null>;
  probeServerVersions: (rootIds: TreeNodeId[]) => Promise<void>;
  hydrateOpenBranch: (node: TreeNode, visited: Set<string>) => Promise<void>;
  refreshRootVersion: (rootNode: TreeNode) => Promise<void>;
  handleToggleNode: (node: TreeNode) => Promise<void>;
}

interface UseNodeLoaderParams {
  setTreeData: Dispatch<SetStateAction<TreeNode[]>>;
  openNodes: OpenNodes;
  setOpenNodes: Dispatch<SetStateAction<OpenNodes>>;
  openNodesRef: RefObject<OpenNodes>;
}

/**
 * 节点加载层：children 懒加载、版本探测、展开分支恢复。
 * 并发加载用 loadSeqRef 做"最后一次请求写回"的 race guard。
 */
export function useNodeLoader({
  setTreeData,
  openNodes,
  setOpenNodes,
  openNodesRef,
}: UseNodeLoaderParams): NodeLoaderState {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // nodeId -> 递增序号：并发加载时只有最后一次发起的请求可以写回树（P0-4）
  const loadSeqRef = useRef<Map<string, number>>(new Map());
  // 正在探测版本的根节点：避免 StrictMode 双执行时重复探测
  const versionProbeRef = useRef<Set<string>>(new Set());

  const nextLoadSeq = useCallback((nodeId: TreeNodeId) => {
    const key = String(nodeId);
    const seq = (loadSeqRef.current.get(key) ?? 0) + 1;
    loadSeqRef.current.set(key, seq);
    return seq;
  }, []);

  const isLatestLoad = useCallback(
    (nodeId: TreeNodeId, seq: number) =>
      loadSeqRef.current.get(String(nodeId)) === seq,
    [],
  );

  useEffect(() => {
    const loadSeqMap = loadSeqRef.current;
    return () => loadSeqMap.clear();
  }, []);

  const fetchNodeChildren = useCallback(
    async (parentNode: TreeNode) => {
      const seq = nextLoadSeq(parentNode.id);

      setTreeData((prevTree) =>
        updateNodeInTree(prevTree, parentNode.id, {
          isLoading: true,
          error: null,
        }),
      );

      try {
        const responseJson = await listNodeInfo({
          level_infos: parentNode.path,
        });
        const { response_code, response_msg } =
          parseBaseResponse<ListNodeInfoResponse>(responseJson);
        if (response_code !== 0) {
          throw new Error(response_msg || "加载失败");
        }

        // 先构建 childNodes 再写 state：调用方需要立即拿到返回值（不依赖 React 批处理时机）
        const childNodes = mapChildList(
          parentNode,
          response_msg.list,
          getNodeIcon,
        );

        if (isLatestLoad(parentNode.id, seq)) {
          setTreeData((prevTree) =>
            updateNodeInTree(prevTree, parentNode.id, {
              children: childNodes,
              isLoading: false,
              error: null,
            }),
          );
        }

        return childNodes;
      } catch (error) {
        console.error("Failed to fetch node children:", error);
        if (isLatestLoad(parentNode.id, seq)) {
          setTreeData((prevTree) =>
            updateNodeInTree(prevTree, parentNode.id, {
              // 保持 null，便于重试/再次展开重新触发拉取
              children: null,
              isLoading: false,
              error: getErrorMessage(error),
            }),
          );
        }
        return null;
      }
    },
    [isLatestLoad, nextLoadSeq, setTreeData],
  );

  const probeServerVersions = useCallback(
    async (rootIds: TreeNodeId[]) => {
      const targets = rootIds.filter(
        (id) => !versionProbeRef.current.has(String(id)),
      );
      if (targets.length === 0) return;

      targets.forEach((id) => {
        versionProbeRef.current.add(String(id));
      });
      setIsRefreshing(true);

      try {
        const results = await Promise.allSettled(
          targets.map(async (id) => {
            try {
              const res = await fetchServerVersion(Number(id));
              const { response_code, response_msg } =
                parseBaseResponse<string>(res);
              if (response_code === 0) {
                return {
                  id,
                  update: { version: response_msg || null, offline: false },
                };
              }
              return { id, update: { offline: true } };
            } catch {
              return { id, update: { offline: true } };
            }
          }),
        );

        setTreeData((prev) => {
          let updated = prev;
          for (const r of results) {
            if (r.status === "fulfilled" && r.value) {
              updated = updateNodeInTree(updated, r.value.id, r.value.update);
            }
          }
          return updated;
        });
      } finally {
        targets.forEach((id) => {
          versionProbeRef.current.delete(String(id));
        });
        setIsRefreshing(false);
      }
    },
    [setTreeData],
  );

  // 恢复已展开但尚未加载 children 的分支（初始挂载 / 连接信息重置两类场景）
  const hydrateOpenBranch = useCallback(
    async (node: TreeNode, visited: Set<string>) => {
      const key = String(node.id);
      if (visited.has(key)) return;
      visited.add(key);

      if (!openNodesRef.current[node.id]) return;

      let current = node;
      if (current.children === null) {
        const children = await fetchNodeChildren(current);
        if (!children) return;
        current = { ...current, children };
      }
      if (!Array.isArray(current.children) || current.children.length === 0) {
        return;
      }

      for (const child of current.children) {
        await hydrateOpenBranch(child, visited);
      }
    },
    [fetchNodeChildren, openNodesRef],
  );

  // 根节点刷新时顺带重探服务端版本 / 在线状态
  const refreshRootVersion = useCallback(
    async (rootNode: TreeNode) => {
      try {
        const res = await fetchServerVersion(Number(rootNode.id));
        const { response_code, response_msg } = parseBaseResponse<string>(res);
        const update =
          response_code === 0
            ? { version: response_msg || null, offline: false }
            : { offline: true };
        setTreeData((prev) => updateNodeInTree(prev, rootNode.id, update));
      } catch {
        setTreeData((prev) =>
          updateNodeInTree(prev, rootNode.id, { offline: true }),
        );
      }
    },
    [setTreeData],
  );

  const handleToggleNode = async (node: TreeNode) => {
    const isCurrentlyOpen = openNodes[node.id];

    setOpenNodes((prev) => ({ ...prev, [node.id]: !isCurrentlyOpen }));

    if (!isCurrentlyOpen && node.children === null) {
      await fetchNodeChildren(node);
    }
  };

  return {
    isRefreshing,
    nextLoadSeq,
    isLatestLoad,
    fetchNodeChildren,
    probeServerVersions,
    hydrateOpenBranch,
    refreshRootVersion,
    handleToggleNode,
  };
}
