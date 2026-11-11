import { Fragment } from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaDatabase,
  FaKey,
} from "react-icons/fa";
import type { SqlHeader } from "../../types/backend";
import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import JsonCell from "../ui/JsonCell";
import { EmptyState, ErrorState } from "../ui/states";
import { buildDocument } from "./esDocumentModel";

export interface DocumentTableProps {
  documents: (string | null)[][];
  headers: SqlHeader[];
  expandedRows: Set<number>;
  loading: boolean;
  error: string | null;
  hasActiveFilter: boolean;
  onToggleRow: (rowIndex: number) => void;
  onRetry: () => void;
}

/** ES 文档表：三态外壳 + 行展开还原文档 JSON。 */
function DocumentTable({
  documents,
  headers,
  expandedRows,
  loading,
  error,
  hasActiveFilter,
  onToggleRow,
  onRetry,
}: DocumentTableProps) {
  if (error) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ErrorState
          title="读取文档失败"
          description={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <DataTableShell
      loading={loading}
      isEmpty={documents.length === 0 && !loading}
      placeholder={
        <EmptyState
          title="暂无文档"
          description={
            hasActiveFilter
              ? "当前搜索条件下没有匹配的文档，试试调整条件。"
              : "该索引中还没有文档。"
          }
          icon={<FaDatabase size="1.6em" aria-hidden="true" />}
        />
      }
    >
      <table className={TABLE_CLASS}>
        <thead>
          <tr>
            <th className="w-8" scope="col" aria-label="展开文档详情" />
            {headers.map((header) => (
              <th key={header.name} scope="col">
                {header.name}
                {header.is_primary_key ? (
                  <span
                    className="ml-1 inline-flex gap-0.5 text-warning"
                    title="主键"
                  >
                    <FaKey size="0.8em" aria-hidden="true" />
                    <span className="sr-only">主键</span>
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((row, rowIndex) => (
            <Fragment key={rowIndex}>
              <tr
                className="cursor-pointer"
                onClick={() => onToggleRow(rowIndex)}
              >
                <td className="w-8 text-center text-base-content/40">
                  {expandedRows.has(rowIndex) ? (
                    <FaChevronDown size="0.7em" aria-hidden="true" />
                  ) : (
                    <FaChevronRight size="0.7em" aria-hidden="true" />
                  )}
                </td>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="max-w-md overflow-hidden">
                    <JsonCell value={cell} maxLength={120} stopPropagation />
                  </td>
                ))}
              </tr>
              {expandedRows.has(rowIndex) ? (
                <tr>
                  <td colSpan={headers.length + 1} className="p-0">
                    <div className="p-2">
                      <div className="mb-1 text-micro font-medium text-base-content/50">
                        文档详情
                      </div>
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-control)] bg-base-200 p-2.5 font-mono text-xs">
                        {JSON.stringify(buildDocument(row, headers), null, 2)}
                      </pre>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );
}

export default DocumentTable;
