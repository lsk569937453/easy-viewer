import type { SqlHeader } from "../../types/backend";
import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import JsonCell from "../ui/JsonCell";
import { EmptyState, ErrorState } from "../ui/states";
import {
  formatMessageTimestamp,
  type MessagePanelConfig,
} from "./messageConfigs";

const BODY_PRE_CLASS =
  "max-w-md overflow-x-auto rounded bg-base-200 p-1.5 text-[11px] leading-relaxed";
const BODY_TEXT_CLASS = "block max-w-md break-all font-mono text-[11px]";

export interface MessageCellProps {
  value: string | null;
  /** 对应列的表头名（缺失时不参与正文/时间列判定） */
  headerName: string | undefined;
  bodyHeader: string;
  timeHeader: string;
}

/**
 * 消息单元格：正文列交给 JsonCell（JSON 美化、非法 JSON 原样），
 * 时间列本地化，其余列原样输出。
 */
export function MessageCell({
  value,
  headerName,
  bodyHeader,
  timeHeader,
}: MessageCellProps) {
  if (value === null || value === undefined) return "-";

  if (headerName === bodyHeader) {
    return (
      <JsonCell
        value={value}
        preClassName={BODY_PRE_CLASS}
        textClassName={BODY_TEXT_CLASS}
        // 旧实现只要 JSON.parse 成功就按 <pre> 展示（含 123/true/"abc" 这类标量）
        parseScalarJson
      />
    );
  }

  if (headerName === timeHeader) {
    return <>{formatMessageTimestamp(value)}</>;
  }

  return <>{value}</>;
}

export interface MessageTableProps {
  headers: SqlHeader[];
  /** 已过滤、当前页要展示的行 */
  rows: (string | null)[][];
  config: MessagePanelConfig;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  partitionFilter: string;
  onRetry: () => void;
}

/** 消息表格：DataTableShell + 表头 + 行渲染，空/错误占位沿用原文案。 */
function MessageTable({
  headers,
  rows,
  config,
  loading,
  error,
  searchTerm,
  partitionFilter,
  onRetry,
}: MessageTableProps) {
  return (
    <DataTableShell
      loading={loading}
      isEmpty={!error && rows.length === 0}
      placeholder={
        error ? (
          <ErrorState
            className="m-3"
            title="消息读取失败"
            description={error}
            onRetry={onRetry}
          />
        ) : (
          <EmptyState
            title="暂无消息"
            description={
              searchTerm ||
              (config.supportsPartitionFilter && partitionFilter !== "all")
                ? "尝试调整过滤条件。"
                : config.emptyHint
            }
          />
        )
      }
    >
      <table className={TABLE_CLASS}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header.name}>{header.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="max-w-md overflow-hidden">
                  <MessageCell
                    value={cell}
                    headerName={headers[cellIndex]?.name}
                    bodyHeader={config.bodyHeader}
                    timeHeader={config.timeHeader}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );
}

export default MessageTable;
