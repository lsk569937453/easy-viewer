import { useCallback, useEffect, useState } from "react";
import type { ConnectionSummary, SqlHeader } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { getErrorMessage } from "../../utils/error";
import { showError, showSuccess } from "../../utils/showToast";
import {
  deleteRedisKey,
  expireRedisKey,
  fetchRedisKeySnapshot,
  persistRedisKey,
} from "./redisKeyData";
import { getTypeMeta, type RedisTypeMeta } from "./redisKeyUtils";

export interface RedisKeyDetailState {
  connectionId: number;
  keyName: string | undefined;
  ttl: number | null;
  memoryUsage: number | null;
  headers: SqlHeader[];
  rows: (string | null)[][];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  filteredRows: (string | null)[][];
  totalPages: number;
  safeCurrentPage: number;
  paginatedRows: (string | null)[][];
  isStringType: boolean;
  typeMeta: RedisTypeMeta;
  actionLoading: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  showTtlModal: boolean;
  newTtlSeconds: string;
  setNewTtlSeconds: (value: string) => void;
  openTtlModal: () => void;
  closeTtlModal: () => void;
  handleDelete: () => void;
  handleSetTtl: () => void;
  handleCopyValue: (value: string) => void;
  fetchAllData: () => Promise<void>;
}

/**
 * Redis 键详情的数据与状态：键元数据、值（exe_sql）、搜索、分页与三个弹窗动作。
 * 拆分前是 RedisKeyDetailPanel 主函数内的全部逻辑，语义与顺序未变。
 */
export function useRedisKeyDetail(
  activeTabNode: TreeNode,
  connectionDetails: ConnectionSummary,
  onKeyDeleted?: (node: TreeNode) => void,
): RedisKeyDetailState {
  const connectionId = connectionDetails.base_config_id;
  const keyName =
    activeTabNode?.path?.[activeTabNode.path.length - 1]?.config_value ||
    activeTabNode?.name;
  // 命令里的键名沿用原模板字符串语义（keyName 为空时行为不变）
  const commandKey = String(keyName);

  // 键元数据
  const [keyType, setKeyType] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);

  // 值数据（来自 exe_sql）
  const [headers, setHeaders] = useState<SqlHeader[]>([]);
  const [rows, setRows] = useState<(string | null)[][]>([]);

  // 界面状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 分页
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);

  // 弹窗
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTtlModal, setShowTtlModal] = useState(false);
  const [newTtlSeconds, setNewTtlSeconds] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ─── 数据读取 ──────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    if (!keyName || !connectionId) {
      setLoading(false);
      setError("缺少键名或连接信息，无法读取键值。");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const snapshot = await fetchRedisKeySnapshot({
        connectionId,
        keyName,
        path: activeTabNode.path,
        pageSize,
      });
      if (snapshot.headers !== undefined) setHeaders(snapshot.headers);
      if (snapshot.rows !== undefined) setRows(snapshot.rows);
      if (snapshot.error !== undefined) setError(snapshot.error);
      if (snapshot.keyType !== undefined) setKeyType(snapshot.keyType);
      if (snapshot.ttl !== undefined) setTtl(snapshot.ttl);
      if (snapshot.memoryUsage !== undefined) {
        setMemoryUsage(snapshot.memoryUsage);
      }
    } catch (err) {
      setError(`读取键值失败：${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, [keyName, connectionId, activeTabNode.path, pageSize]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  // 每页条数变化后回到第一页
  useEffect(() => {
    setCurrentPage(0);
  }, [pageSize]);

  // 搜索词变化后回到第一页
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm]);

  // ─── 操作 ──────────────────────────────────────────────────────

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const deleted = await deleteRedisKey(connectionId, commandKey);
      if (deleted) {
        setShowDeleteConfirm(false);
        // 通知父级移除树节点并关闭标签页
        if (onKeyDeleted) {
          onKeyDeleted(activeTabNode);
        }
      } else {
        showError("删除键失败");
      }
    } catch (err) {
      showError(`删除失败：${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openTtlModal = () => {
    setNewTtlSeconds("");
    setShowTtlModal(true);
  };

  const closeTtlModal = () => {
    setShowTtlModal(false);
    setNewTtlSeconds("");
  };

  const handleSetTtl = async () => {
    const input = newTtlSeconds.trim();

    // 留空或 0 → PERSIST（移除过期时间）
    if (input === "" || input === "0") {
      setActionLoading(true);
      try {
        await persistRedisKey(connectionId, commandKey);
        setTtl(-1);
        closeTtlModal();
      } catch (err) {
        showError(`移除过期时间失败：${getErrorMessage(err)}`);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    const seconds = Number(input);
    if (Number.isNaN(seconds) || seconds <= 0) {
      showError("请输入大于 0 的秒数");
      return;
    }
    setActionLoading(true);
    try {
      const applied = await expireRedisKey(connectionId, commandKey, seconds);
      if (applied) {
        setTtl(seconds);
        closeTtlModal();
      } else {
        showError("设置过期时间失败，键可能已不存在");
      }
    } catch (err) {
      showError(`设置过期时间失败：${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyValue = (value: string) => {
    void navigator.clipboard
      .writeText(String(value ?? ""))
      .then(() => showSuccess("已复制到剪贴板"))
      .catch((err: unknown) => showError(`复制失败：${getErrorMessage(err)}`));
  };

  // ─── 搜索与分页 ────────────────────────────────────────────────

  const filteredRows = rows.filter((row) => {
    if (!searchTerm) return true;
    return row.some((cell) =>
      String(cell || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const paginatedRows = filteredRows.slice(
    safeCurrentPage * pageSize,
    (safeCurrentPage + 1) * pageSize,
  );

  const isStringType = keyType === "string";
  const typeMeta = getTypeMeta(keyType);

  return {
    connectionId,
    keyName,
    ttl,
    memoryUsage,
    headers,
    rows,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    filteredRows,
    totalPages,
    safeCurrentPage,
    paginatedRows,
    isStringType,
    typeMeta,
    actionLoading,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showTtlModal,
    newTtlSeconds,
    setNewTtlSeconds,
    openTtlModal,
    closeTtlModal,
    handleDelete,
    handleSetTtl,
    handleCopyValue,
    fetchAllData,
  };
}
