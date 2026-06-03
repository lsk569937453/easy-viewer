import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SiRedis } from "react-icons/si";
import {
  IoRefresh,
  IoTrashOutline,
  IoSearch,
  IoArrowBack,
  IoArrowForward,
} from "react-icons/io5";
import { FaClock, FaCopy } from "react-icons/fa";

// ─── Utility Functions ────────────────────────────────────────────────

const formatTtl = (seconds) => {
  if (seconds === null || seconds === undefined) return "Loading...";
  const s = Number(seconds);
  if (s === -1) return "No expiry";
  if (s === -2) return "Key not found";
  if (s <= 0) return "Expired";

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return `Expires in ${parts.join(" ")}`;
};

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return "N/A";
  const b = Number(bytes);
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const TYPE_BADGE_MAP = {
  string: { label: "String", cls: "badge-error" },
  hash: { label: "Hash", cls: "badge-secondary" },
  list: { label: "List", cls: "badge-success" },
  set: { label: "Set", cls: "badge-warning" },
  zset: { label: "Sorted Set", cls: "badge-accent" },
};

const getTypeBadge = (type) =>
  TYPE_BADGE_MAP[type] || { label: type || "Unknown", cls: "badge-ghost" };

const tryFormatJson = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // not JSON
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────

function RedisKeyDetailPanel({ activeTabNode, connectionDetails, onKeyDeleted }) {
  const connectionId = connectionDetails?.base_config_id;
  const keyName =
    activeTabNode?.path?.[activeTabNode.path.length - 1]?.config_value ||
    activeTabNode?.name;

  // Metadata
  const [keyType, setKeyType] = useState(null);
  const [ttl, setTtl] = useState(null);
  const [memoryUsage, setMemoryUsage] = useState(null);

  // Value data (from exe_sql)
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);

  // Action modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTtlModal, setShowTtlModal] = useState(false);
  const [newTtlSeconds, setNewTtlSeconds] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    if (!keyName || !connectionId) return;
    setLoading(true);
    setError(null);

    try {
      const [valueResult, typeResult, ttlResult, memoryResult] =
        await Promise.allSettled([
          // Value content via exe_sql
          invoke("exe_sql", {
            listNodeInfoReq: { level_infos: activeTabNode.path },
            sql: `SELECT * FROM ${keyName} LIMIT ${pageSize}`,
          }),
          // Key type via redis_execute_command
          invoke("redis_execute_command", {
            connectionId,
            command: `TYPE "${keyName}"`,
          }),
          // TTL via redis_execute_command
          invoke("redis_execute_command", {
            connectionId,
            command: `TTL "${keyName}"`,
          }),
          // Memory usage via redis_execute_command
          invoke("redis_execute_command", {
            connectionId,
            command: `MEMORY USAGE "${keyName}"`,
          }),
        ]);

      // Parse value content
      if (valueResult.status === "fulfilled") {
        const { response_code, response_msg } = JSON.parse(valueResult.value);
        if (response_code === 0 && response_msg) {
          setHeaders(response_msg.header || []);
          setRows(response_msg.rows || []);
        } else {
          setError(response_msg || "Failed to fetch key data");
        }
      } else {
        setError("Failed to fetch key value");
      }

      // Parse key type
      if (typeResult.status === "fulfilled") {
        const parsed = parseRedisCommandResponse(typeResult.value);
        if (parsed) setKeyType(parsed.value);
      }

      // Parse TTL
      if (ttlResult.status === "fulfilled") {
        const parsed = parseRedisCommandResponse(ttlResult.value);
        if (parsed) setTtl(Number(parsed.value));
      }

      // Parse memory usage
      if (memoryResult.status === "fulfilled") {
        const parsed = parseRedisCommandResponse(memoryResult.value);
        if (parsed && parsed.value && parsed.value !== "(nil)") {
          setMemoryUsage(Number(parsed.value));
        } else {
          setMemoryUsage(null);
        }
      }
    } catch (err) {
      setError(`Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [keyName, connectionId, activeTabNode?.path, pageSize]);

  const parseRedisCommandResponse = (responseJson) => {
    try {
      const { response_code, response_msg } = JSON.parse(responseJson);
      if (response_code === 0) {
        return typeof response_msg === "string"
          ? JSON.parse(response_msg)
          : response_msg;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Reset page when page size changes
  useEffect(() => {
    setCurrentPage(0);
  }, [pageSize]);

  // ─── Actions ──────────────────────────────────────────────────────

  // Execute a Redis command via redis_execute_command and return parsed result or throw
  const executeRedisCommand = async (command) => {
    const responseJson = await invoke("redis_execute_command", {
      connectionId,
      command,
    });
    const { response_code, response_msg } = JSON.parse(responseJson);

    if (response_code !== 0) {
      throw new Error(response_msg || "Command execution failed");
    }

    const parsed = typeof response_msg === "string"
      ? JSON.parse(response_msg)
      : response_msg;

    if (parsed.response_type === "error") {
      throw new Error(parsed.value || "Redis returned an error");
    }

    return parsed;
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const parsed = await executeRedisCommand(`DEL "${keyName}"`);
      if (parsed.response_type === "integer" && Number(parsed.value) > 0) {
        setShowDeleteConfirm(false);
        // Notify parent to remove tree node and close tab
        if (onKeyDeleted) {
          onKeyDeleted(activeTabNode);
        }
      } else {
        alert("Failed to delete key");
      }
    } catch (err) {
      alert(`Delete failed: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetTtl = async () => {
    const input = newTtlSeconds.trim();

    // Empty input → PERSIST (remove expiry)
    if (input === "" || input === "0") {
      setActionLoading(true);
      try {
        await executeRedisCommand(`PERSIST "${keyName}"`);
        setTtl(-1);
        setShowTtlModal(false);
        setNewTtlSeconds("");
      } catch (err) {
        alert(`Failed to remove expiry: ${err.message || err}`);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    const seconds = Number(input);
    if (isNaN(seconds) || seconds <= 0) {
      alert("Please enter a positive number of seconds");
      return;
    }
    setActionLoading(true);
    try {
      const parsed = await executeRedisCommand(`EXPIRE "${keyName}" ${seconds}`);
      if (parsed.response_type === "integer" && Number(parsed.value) === 1) {
        setTtl(seconds);
        setShowTtlModal(false);
        setNewTtlSeconds("");
      } else {
        alert("Failed to set TTL. Key may not exist.");
      }
    } catch (err) {
      alert(`Set TTL failed: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyValue = (value) => {
    navigator.clipboard.writeText(String(value || ""));
  };

  // ─── Search / Filter ──────────────────────────────────────────────

  const filteredRows = rows.filter((row) => {
    if (!searchTerm) return true;
    return row.some((cell) =>
      String(cell || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  // ─── Pagination ───────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const paginatedRows = filteredRows.slice(
    safeCurrentPage * pageSize,
    (safeCurrentPage + 1) * pageSize
  );

  // ─── Value Rendering ──────────────────────────────────────────────

  const renderValue = (value, maxLen = 500) => {
    if (value === null || value === undefined) {
      return <span className="text-base-content/30">(nil)</span>;
    }
    const strValue = String(value);

    // Try JSON formatting
    const jsonFormatted = tryFormatJson(strValue);
    if (jsonFormatted) {
      return (
        <div className="relative group">
          <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
            {jsonFormatted.length > maxLen
              ? jsonFormatted.substring(0, maxLen) + "..."
              : jsonFormatted}
          </pre>
          <button
            className="absolute top-1 right-1 btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleCopyValue(strValue)}
            title="Copy"
          >
            <FaCopy size="0.7em" />
          </button>
        </div>
      );
    }

    return (
      <span
        className="font-mono text-xs break-all"
        title={strValue.length > maxLen ? strValue : undefined}
      >
        {strValue.length > maxLen
          ? strValue.substring(0, maxLen) + "..."
          : strValue}
      </span>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────

  const badge = getTypeBadge(keyType);

  return (
    <div className="flex flex-col h-full">
      {/* ─── Toolbar ─── */}
      <div className="flex-shrink-0 border-b border-base-content/10 px-4 py-3 bg-base-200/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <SiRedis className="text-error flex-shrink-0" size="1.2em" />
            <h3 className="text-lg font-semibold text-primary truncate max-w-[300px]">
              {keyName}
            </h3>
            <span className={`badge badge-sm ${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className={`btn btn-sm btn-outline ${loading ? "loading" : ""}`}
              onClick={fetchAllData}
              disabled={loading}
              title="Refresh"
            >
              <IoRefresh className="mr-1" />
              Refresh
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                setNewTtlSeconds("");
                setShowTtlModal(true);
              }}
              title="Set TTL"
            >
              <FaClock className="mr-1" />
              TTL
            </button>
            <button
              className="btn btn-sm btn-outline btn-error"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Key"
            >
              <IoTrashOutline className="mr-1" />
              Delete
            </button>
            <div className="join">
              <input
                type="text"
                placeholder="Search..."
                className="input input-bordered input-sm join-item w-36"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-sm join-item" disabled>
                <IoSearch />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Metadata Strip ─── */}
      <div className="flex-shrink-0 px-4 py-2 bg-base-300/30 text-xs text-base-content/70 flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1">
          <FaClock size="0.7em" />
          {formatTtl(ttl)}
        </span>
        {memoryUsage !== null && (
          <span>{formatBytes(memoryUsage)}</span>
        )}
        <span>
          {filteredRows.length} item{filteredRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ─── Value Content ─── */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="alert alert-error m-4">
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/40">
            <p className="text-lg">No data</p>
            <p className="text-sm mt-2">Key may be empty or not found</p>
          </div>
        ) : keyType === "string" ? (
          // String: single value display
          <div className="p-4">
            {renderValue(
              rows[0]?.[rows[0].length - 1],
              10000
            )}
          </div>
        ) : (
          // Table types: hash, list, set, zset
          <table className="table table-zebra table-pin-rows text-sm">
            <thead className="bg-base-200">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-xs font-semibold">
                    {h.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="max-w-md">
                      {cellIdx === headers.length - 1 &&
                      headers.length > 1 ? (
                        // Last column (usually "value"): rich rendering
                        renderValue(cell)
                      ) : (
                        // Key/index/field columns: plain text
                        <span className="font-mono text-xs">{cell ?? "-"}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Pagination (non-string types) ─── */}
      {keyType !== "string" && filteredRows.length > 0 && (
        <div className="flex-shrink-0 border-t border-base-content/10 px-4 py-2 bg-base-200/30">
          <div className="flex items-center justify-between text-xs text-base-content/70">
            <div className="flex items-center gap-2">
              <span>
                Page {safeCurrentPage + 1} / {totalPages}
              </span>
              <select
                className="select select-bordered select-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
              <span>per page</span>
            </div>
            <div className="join">
              <button
                className="btn btn-sm join-item"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={safeCurrentPage === 0}
              >
                <IoArrowBack />
              </button>
              <button
                className="btn btn-sm join-item"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={safeCurrentPage >= totalPages - 1}
              >
                <IoArrowForward />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">Delete Key</h3>
            <p className="py-4">
              Are you sure you want to delete key{" "}
              <span className="font-semibold text-primary">"{keyName}"</span>?
              This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`btn btn-error ${actionLoading ? "loading" : ""}`}
                onClick={handleDelete}
                disabled={actionLoading}
              >
                <IoTrashOutline className="mr-1" />
                Delete
              </button>
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => setShowDeleteConfirm(false)}
          ></form>
        </dialog>
      )}

      {/* ─── Set TTL Modal ─── */}
      {showTtlModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Set TTL</h3>
            <p className="py-2 text-sm text-base-content/70">
              Set expiration for key{" "}
              <span className="font-semibold text-primary">"{keyName}"</span>
            </p>
            <div className="form-control py-2">
              <label className="label">
                <span className="label-text">Seconds until expiry</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                placeholder="e.g. 3600 (1 hour), 86400 (1 day)"
                value={newTtlSeconds}
                onChange={(e) => setNewTtlSeconds(e.target.value)}
                min="0"
                autoFocus
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Leave empty or enter 0 to remove expiry (PERSIST)
                </span>
              </label>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowTtlModal(false);
                  setNewTtlSeconds("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary ${actionLoading ? "loading" : ""}`}
                onClick={handleSetTtl}
                disabled={actionLoading}
              >
                <FaClock className="mr-1" />
                Set TTL
              </button>
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => {
              setShowTtlModal(false);
              setNewTtlSeconds("");
            }}
          ></form>
        </dialog>
      )}
    </div>
  );
}

export default RedisKeyDetailPanel;
