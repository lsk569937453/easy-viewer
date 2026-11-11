import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { FaClock, FaCopy } from "react-icons/fa";
import { IoRefresh, IoSearchOutline, IoTrashOutline } from "react-icons/io5";
import { SiRedis } from "react-icons/si";
import type {
  ConnectionSummary,
  ExeSqlResponse,
  RedisCommandResponse,
  SqlHeader,
} from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import ActionButton from "./ui/ActionButton";
import ConfirmDialog from "./ui/ConfirmDialog";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import FormField from "./ui/FormField";
import KeyValueTable from "./ui/KeyValueTable";
import PageHeader from "./ui/PageHeader";
import Pagination from "./ui/Pagination";
import SearchBox from "./ui/SearchBox";
import StatusChip, { type StatusTone } from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";
import Toolbar from "./ui/Toolbar";

// ─── 常量与纯函数 ─────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

const TYPE_META: Record<string, { label: string; tone: StatusTone }> = {
  string: { label: "字符串", tone: "info" },
  hash: { label: "哈希", tone: "success" },
  list: { label: "列表", tone: "warning" },
  set: { label: "集合", tone: "neutral" },
  zset: { label: "有序集合", tone: "info" },
};

const getTypeMeta = (
  type: string | null,
): { label: string; tone: StatusTone } =>
  (type ? TYPE_META[type] : undefined) ?? {
    label: type || "未知",
    tone: "neutral",
  };

const formatTtl = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "读取中…";
  const s = Number(seconds);
  if (!Number.isFinite(s)) return "未知";
  if (s === -1) return "永不过期";
  if (s === -2) return "键不存在";
  if (s <= 0) return "已过期";

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} 秒`);

  return `剩余 ${parts.join(" ")}`;
};

const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return "—";
  const b = Number(bytes);
  if (!Number.isFinite(b)) return "—";
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(b) / Math.log(1024)),
  );
  return `${(b / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const tryFormatJson = (value: string): string | null => {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // 非 JSON，按纯文本展示
  }
  return null;
};

const parseRedisCommandResponse = (
  responseJson: string,
): RedisCommandResponse | null => {
  try {
    const { response_code, response_msg } =
      parseBaseResponse<RedisCommandResponse>(responseJson);
    if (response_code === 0) {
      return response_msg;
    }
  } catch {
    // 解析失败时按"无结果"处理，由调用方保留原状态
  }
  return null;
};

// ─── 组件 ─────────────────────────────────────────────────────────────

interface RedisKeyDetailPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
  onKeyDeleted?: (node: TreeNode) => void;
}

function RedisKeyDetailPanel({
  activeTabNode,
  connectionDetails,
  onKeyDeleted,
}: RedisKeyDetailPanelProps) {
  const connectionId = connectionDetails.base_config_id;
  const keyName =
    activeTabNode?.path?.[activeTabNode.path.length - 1]?.config_value ||
    activeTabNode?.name;

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
      const [valueResult, typeResult, ttlResult, memoryResult] =
        await Promise.allSettled([
          // 值内容通过 exe_sql 读取
          invoke<string>("exe_sql", {
            listNodeInfoReq: { level_infos: activeTabNode.path },
            sql: `SELECT * FROM ${keyName} LIMIT ${pageSize}`,
          }),
          // 键类型
          invoke<string>("redis_execute_command", {
            connectionId,
            command: `TYPE "${keyName}"`,
          }),
          // 剩余过期时间
          invoke<string>("redis_execute_command", {
            connectionId,
            command: `TTL "${keyName}"`,
          }),
          // 内存占用
          invoke<string>("redis_execute_command", {
            connectionId,
            command: `MEMORY USAGE "${keyName}"`,
          }),
        ]);

      // 值内容
      if (valueResult.status === "fulfilled") {
        const { response_code, response_msg } =
          parseBaseResponse<ExeSqlResponse>(valueResult.value);
        if (response_code === 0) {
          setHeaders(response_msg.header);
          setRows(response_msg.rows);
        } else {
          setError(response_msg || "读取键值内容失败");
        }
      } else {
        setError("读取键值内容失败");
      }

      // 键类型
      if (typeResult.status === "fulfilled") {
        const parsed = parseRedisCommandResponse(typeResult.value);
        if (parsed?.value) setKeyType(parsed.value);
      }

      // 过期时间
      if (ttlResult.status === "fulfilled") {
        const parsed = parseRedisCommandResponse(ttlResult.value);
        if (parsed) setTtl(Number(parsed.value));
      }

      // 内存占用
      if (memoryResult.status === "fulfilled") {
        const parsed = parseRedisCommandResponse(memoryResult.value);
        if (parsed?.value && parsed.value !== "(nil)") {
          setMemoryUsage(Number(parsed.value));
        } else {
          setMemoryUsage(null);
        }
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

  // 执行 Redis 命令，成功返回解析结果，失败抛出错误
  const executeRedisCommand = async (
    command: string,
  ): Promise<RedisCommandResponse> => {
    const responseJson = await invoke<string>("redis_execute_command", {
      connectionId,
      command,
    });
    const { response_code, response_msg } =
      parseBaseResponse<RedisCommandResponse>(responseJson);

    if (response_code !== 0) {
      throw new Error(response_msg || "命令执行失败");
    }

    const parsed = response_msg;

    if (parsed.response_type === "error") {
      throw new Error(parsed.value || "Redis 返回错误");
    }

    return parsed;
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const parsed = await executeRedisCommand(`DEL "${keyName}"`);
      if (parsed.response_type === "integer" && Number(parsed.value) > 0) {
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
        await executeRedisCommand(`PERSIST "${keyName}"`);
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
      const parsed = await executeRedisCommand(
        `EXPIRE "${keyName}" ${seconds}`,
      );
      if (parsed.response_type === "integer" && Number(parsed.value) === 1) {
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

  // 过滤为客户端实时完成；提交时回到第一页，避免停在越界页码上
  const handleSearchSubmit = () => {
    setCurrentPage(0);
  };

  const isStringType = keyType === "string";
  const typeMeta = getTypeMeta(keyType);

  // ─── 值渲染 ────────────────────────────────────────────────────

  const renderStringValue = () => {
    const raw = rows[0]?.[rows[0].length - 1] ?? "";
    const text = tryFormatJson(raw) ?? String(raw);
    const maxLen = 10000;

    return (
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-micro text-base-content/45">字符串值</span>
          <ActionButton
            variant="icon"
            title="复制值"
            aria-label="复制值"
            onClick={() => handleCopyValue(raw)}
            icon={<FaCopy size="0.75em" aria-hidden="true" />}
          />
        </div>
        {text === "" ? (
          <p className="text-xs text-base-content/40">（空字符串）</p>
        ) : (
          <pre className="whitespace-pre-wrap break-all rounded-[var(--radius-control)] border border-hairline bg-base-200/40 p-2 font-mono text-xs leading-relaxed">
            {text.length > maxLen ? `${text.slice(0, maxLen)}…` : text}
          </pre>
        )}
      </div>
    );
  };

  // 键/索引/字段列：纯文本，保持紧凑
  const renderPlainCell = (cell: string | null) => (
    <span className="break-all font-mono text-[11px]">{cell ?? "—"}</span>
  );

  // 值列：JSON 格式化 + 复制
  const renderCellValue = (cell: string | null) => {
    if (cell === null || cell === undefined) {
      return <span className="text-base-content/30">（空）</span>;
    }

    const strValue = String(cell);
    const maxLen = 500;
    const jsonFormatted = tryFormatJson(strValue);

    if (jsonFormatted) {
      return (
        <div className="group relative">
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-control)] bg-base-200/60 p-1.5 font-mono text-[11px] leading-relaxed">
            {jsonFormatted.length > maxLen
              ? `${jsonFormatted.slice(0, maxLen)}…`
              : jsonFormatted}
          </pre>
          <ActionButton
            variant="icon"
            className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            title="复制单元格内容"
            aria-label="复制单元格内容"
            onClick={() => handleCopyValue(strValue)}
            icon={<FaCopy size="0.7em" aria-hidden="true" />}
          />
        </div>
      );
    }

    return (
      <span
        className="break-all font-mono text-[11px]"
        title={strValue.length > maxLen ? strValue : undefined}
      >
        {strValue.length > maxLen ? `${strValue.slice(0, maxLen)}…` : strValue}
      </span>
    );
  };

  // ─── 视图 ──────────────────────────────────────────────────────

  const metaRows = [
    {
      label: "键名",
      value: (
        <span className="flex items-start gap-1">
          <span className="min-w-0 break-all font-mono">{keyName}</span>
          <ActionButton
            variant="icon"
            title="复制键名"
            aria-label="复制键名"
            onClick={() => handleCopyValue(String(keyName ?? ""))}
            icon={<FaCopy size="0.7em" aria-hidden="true" />}
          />
        </span>
      ),
    },
    { label: "过期时间", value: formatTtl(ttl) },
    {
      label: "内存占用",
      value: memoryUsage === null ? "—" : formatBytes(memoryUsage),
    },
    { label: "条目数量", value: `${filteredRows.length} 项` },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={
          <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
            <SiRedis
              className="flex-shrink-0 text-error"
              size="0.95em"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">{keyName}</span>
          </span>
        }
        subtitle={`连接 ${connectionDetails.connection_name}`}
        meta={<StatusChip tone={typeMeta.tone}>{typeMeta.label}</StatusChip>}
        actions={
          <>
            <ActionButton
              size="sm"
              title="刷新"
              icon={<IoRefresh aria-hidden="true" />}
              loading={loading}
              onClick={() => void fetchAllData()}
            >
              刷新
            </ActionButton>
            <ActionButton
              size="sm"
              title="设置过期时间"
              icon={<FaClock aria-hidden="true" />}
              onClick={() => {
                setNewTtlSeconds("");
                setShowTtlModal(true);
              }}
            >
              过期时间
            </ActionButton>
            <ActionButton
              size="sm"
              variant="danger"
              icon={<IoTrashOutline aria-hidden="true" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              删除
            </ActionButton>
          </>
        }
      />

      {/* 键信息（KV 展示） */}
      <div className="flex-shrink-0 border-b border-hairline bg-base-200/25 px-2 py-0.5">
        <KeyValueTable rows={metaRows} labelWidth="4.5rem" />
      </div>

      {/* 搜索与计数 */}
      <Toolbar
        left={
          <SearchBox
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="搜索键值…"
            ariaLabel="搜索键值"
            submitLabel="搜索"
            onSubmit={handleSearchSubmit}
            onClear={() => setCurrentPage(0)}
            className="max-w-xs"
          />
        }
        right={
          <span className="text-micro text-base-content/45">
            {filteredRows.length} / {rows.length} 项
          </span>
        }
      />

      {/* 内容区 */}
      <DataTableShell
        isEmpty={!!error || (!loading && filteredRows.length === 0)}
        placeholder={
          error ? (
            <ErrorState
              className="m-3"
              title="键值读取失败"
              description={error}
              onRetry={() => void fetchAllData()}
            />
          ) : (
            <EmptyState
              title={searchTerm ? "没有匹配的条目" : "暂无数据"}
              description={
                searchTerm
                  ? "当前搜索条件没有匹配到任何条目，试试更换关键字。"
                  : "该键可能为空，或已被删除。"
              }
              icon={<IoSearchOutline aria-hidden="true" />}
            />
          )
        }
      >
        {loading && filteredRows.length === 0 ? (
          <LoadingState label="正在读取键值…" />
        ) : isStringType ? (
          renderStringValue()
        ) : (
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header.name}>{header.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="max-w-md overflow-hidden">
                      {cellIndex === headers.length - 1 && headers.length > 1
                        ? renderCellValue(cell)
                        : renderPlainCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTableShell>

      {/* 分页（非字符串类型） */}
      {!isStringType && filteredRows.length > 0 ? (
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-hairline px-3 py-1.5">
          <Pagination
            page={safeCurrentPage + 1}
            totalPages={totalPages}
            total={filteredRows.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setCurrentPage(Math.max(0, page - 1))}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : null}

      {/* 删除确认 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="删除键"
        description={
          <>
            确定要删除键{" "}
            <span className="break-all font-mono text-base-content/80">
              「{keyName}」
            </span>{" "}
            吗？该操作不可撤销。
          </>
        }
        confirmText="删除"
        tone="danger"
        busy={actionLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* 设置过期时间 */}
      {showTtlModal ? (
        <dialog className="modal modal-open" aria-labelledby="redis-ttl-title">
          <div className="app-panel modal-box max-w-sm p-0">
            <div className="border-b border-hairline px-4 py-3">
              <h3 id="redis-ttl-title" className="text-[13px] font-semibold">
                设置过期时间
              </h3>
            </div>
            <div className="space-y-2 px-4 py-3">
              <p className="break-all text-micro text-base-content/50">
                键：
                <span className="font-mono text-base-content/75">
                  {keyName}
                </span>
              </p>
              <FormField
                label="过期秒数"
                htmlFor="redis-ttl-seconds"
                help="留空或输入 0 表示移除过期时间（PERSIST）。"
              >
                <input
                  id="redis-ttl-seconds"
                  name="ttlSeconds"
                  type="number"
                  inputMode="numeric"
                  aria-label="过期秒数"
                  className="input h-8 w-full text-xs"
                  placeholder="例如 3600（1 小时）"
                  value={newTtlSeconds}
                  onChange={(event) => setNewTtlSeconds(event.target.value)}
                  min="0"
                  autoFocus
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 border-t border-hairline px-4 py-2.5">
              <ActionButton onClick={closeTtlModal} disabled={actionLoading}>
                取消
              </ActionButton>
              <ActionButton
                variant="primary"
                icon={<FaClock aria-hidden="true" />}
                loading={actionLoading}
                onClick={() => void handleSetTtl()}
              >
                确定
              </ActionButton>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={closeTtlModal}>
              <span className="sr-only">关闭对话框</span>
            </button>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}

export default RedisKeyDetailPanel;
