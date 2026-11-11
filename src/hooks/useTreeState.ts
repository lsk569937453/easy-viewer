import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { buildRootDescriptor } from "../components/database-viewer/connectionSync";
import {
  pruneOpenNodes,
  syncRootsWithConnections,
} from "../components/tree/treeModel";
import {
  loadPersistedOpenNodes,
  savePersistedOpenNodes,
  TREE_STATE_SAVE_DEBOUNCE_MS,
} from "../components/tree/treePersistence";
import type { ConnectionSummary } from "../types/backend";
import type { OpenNodes, TreeNode } from "../types/tree";
import { useDebouncedValue } from "./useDebouncedValue";
import { type NodeLoaderState, useNodeLoader } from "./useNodeLoader";

export interface TreeState extends NodeLoaderState {
  treeData: TreeNode[];
  setTreeData: Dispatch<SetStateAction<TreeNode[]>>;
  openNodes: OpenNodes;
  setOpenNodes: Dispatch<SetStateAction<OpenNodes>>;
  openNodesRef: RefObject<OpenNodes>;
  treeDataRef: RefObject<TreeNode[]>;
}

/**
 * 树状态层：treeData/openNodes、最新快照 refs、展开态持久化，
 * 以及 connections 变化时的根节点增量同步。
 */
export function useTreeState(connections: ConnectionSummary[]): TreeState {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [openNodes, setOpenNodes] = useState<OpenNodes>(() =>
    loadPersistedOpenNodes(),
  );

  const openNodesRef = useRef<OpenNodes>(openNodes);
  useEffect(() => {
    openNodesRef.current = openNodes;
  }, [openNodes]);

  // 展开状态持久化：防抖后整表覆盖写入 localStorage
  const debouncedOpenNodes = useDebouncedValue(
    openNodes,
    TREE_STATE_SAVE_DEBOUNCE_MS,
  );
  useEffect(() => {
    savePersistedOpenNodes(debouncedOpenNodes);
  }, [debouncedOpenNodes]);

  // 树数据的最新快照：connections 同步时需要读取"当前"树，而 effect 闭包里的
  // treeData 可能是上一轮渲染的值
  const treeDataRef = useRef<TreeNode[]>(treeData);
  useEffect(() => {
    treeDataRef.current = treeData;
  }, [treeData]);

  const loader = useNodeLoader({
    setTreeData,
    openNodes,
    setOpenNodes,
    openNodesRef,
  });

  // connections -> 根节点描述（不含 children 等运行时状态）
  const toRootDescriptor = useCallback(
    (conn: ConnectionSummary) => buildRootDescriptor(conn),
    [],
  );

  // connections 变化时按 id 合并根节点：不再全量重建，已加载子树与展开态得以保留
  useEffect(() => {
    let cancelled = false;

    const syncTree = async () => {
      const { roots, addedIds, removedIds, resetIds } =
        syncRootsWithConnections(
          treeDataRef.current,
          connections,
          toRootDescriptor,
        );

      setTreeData(roots);

      if (removedIds.length > 0) {
        setOpenNodes((prev) => pruneOpenNodes(prev, removedIds));
      }

      // 只有新增连接（含首次挂载）与端点变更的连接才探测版本，
      // 未变化的连接不再重复探测，也不再触发全屏"正在检测连接状态"遮罩
      const idsToProbe = [...addedIds, ...resetIds];
      if (idsToProbe.length > 0) {
        await loader.probeServerVersions(idsToProbe);
      }
      if (cancelled) return;

      for (const root of roots) {
        if (cancelled) return;
        await loader.hydrateOpenBranch(root, new Set());
      }
    };

    syncTree();

    return () => {
      cancelled = true;
    };
  }, [
    connections,
    loader.hydrateOpenBranch,
    loader.probeServerVersions,
    toRootDescriptor,
  ]);

  return {
    treeData,
    setTreeData,
    openNodes,
    setOpenNodes,
    openNodesRef,
    treeDataRef,
    ...loader,
  };
}
