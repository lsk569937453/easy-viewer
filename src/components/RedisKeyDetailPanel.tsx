import { IoSearchOutline } from "react-icons/io5";
import type { ConnectionSummary } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { RedisKeyDetailDialogs } from "./redis/RedisKeyDetailDialogs";
import { RedisKeyDetailHeader } from "./redis/RedisKeyDetailHeader";
import {
  RedisPlainCell,
  RedisStringValue,
  RedisTableCell,
} from "./redis/RedisValueCell";
import { PAGE_SIZE_OPTIONS } from "./redis/redisKeyUtils";
import { useRedisKeyDetail } from "./redis/useRedisKeyDetail";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import Pagination from "./ui/Pagination";
import SearchBox from "./ui/SearchBox";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";
import Toolbar from "./ui/Toolbar";

interface RedisKeyDetailPanelProps {
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
  onKeyDeleted?: (node: TreeNode) => void;
}

/**
 * Redis 键详情面板：状态与数据在 useRedisKeyDetail，展示拆到 redis/ 下的子组件，
 * 这里只负责组合，JSX 结构与拆分前一致。
 */
function RedisKeyDetailPanel({
  activeTabNode,
  connectionDetails,
  onKeyDeleted,
}: RedisKeyDetailPanelProps) {
  const detail = useRedisKeyDetail(
    activeTabNode,
    connectionDetails,
    onKeyDeleted,
  );
  const { headers, loading, error, searchTerm, isStringType, filteredRows } =
    detail;

  const stringValue = detail.rows[0]?.[detail.rows[0].length - 1] ?? "";
  // 过滤为客户端实时完成；提交时回到第一页，避免停在越界页码上
  const handleSearchSubmit = () => detail.setCurrentPage(0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RedisKeyDetailHeader
        keyName={detail.keyName}
        connectionName={connectionDetails.connection_name}
        typeMeta={detail.typeMeta}
        ttl={detail.ttl}
        memoryUsage={detail.memoryUsage}
        itemCount={filteredRows.length}
        loading={loading}
        onRefresh={() => void detail.fetchAllData()}
        onOpenTtl={detail.openTtlModal}
        onRequestDelete={() => detail.setShowDeleteConfirm(true)}
        onCopyKey={() => detail.handleCopyValue(String(detail.keyName ?? ""))}
      />

      {/* 搜索与计数 */}
      <Toolbar
        left={
          <SearchBox
            value={searchTerm}
            onChange={detail.setSearchTerm}
            placeholder="搜索键值…"
            ariaLabel="搜索键值"
            submitLabel="搜索"
            onSubmit={handleSearchSubmit}
            onClear={() => detail.setCurrentPage(0)}
            className="max-w-xs"
          />
        }
        right={
          <span className="text-micro text-base-content/45">
            {filteredRows.length} / {detail.rows.length} 项
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
              onRetry={() => void detail.fetchAllData()}
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
          <RedisStringValue raw={stringValue} onCopy={detail.handleCopyValue} />
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
              {detail.paginatedRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="max-w-md overflow-hidden">
                      {cellIndex === headers.length - 1 &&
                      headers.length > 1 ? (
                        <RedisTableCell
                          cell={cell}
                          onCopy={detail.handleCopyValue}
                        />
                      ) : (
                        <RedisPlainCell cell={cell} />
                      )}
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
            page={detail.safeCurrentPage + 1}
            totalPages={detail.totalPages}
            total={filteredRows.length}
            pageSize={detail.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) =>
              detail.setCurrentPage(Math.max(0, page - 1))
            }
            onPageSizeChange={detail.setPageSize}
          />
        </div>
      ) : null}

      <RedisKeyDetailDialogs
        keyName={detail.keyName}
        actionLoading={detail.actionLoading}
        showDeleteConfirm={detail.showDeleteConfirm}
        onCancelDelete={() => detail.setShowDeleteConfirm(false)}
        onConfirmDelete={() => void detail.handleDelete()}
        showTtlModal={detail.showTtlModal}
        newTtlSeconds={detail.newTtlSeconds}
        onTtlSecondsChange={detail.setNewTtlSeconds}
        onCancelTtl={detail.closeTtlModal}
        onConfirmTtl={() => void detail.handleSetTtl()}
      />
    </div>
  );
}

export default RedisKeyDetailPanel;
