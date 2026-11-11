import type { ReactNode } from "react";
import { LoadingState } from "./states";

/** 所有数据表格共用同一套 sticky 表头与行样式（见 App.css 的 .app-table） */
export const TABLE_CLASS = "app-table";

export interface DataTableShellProps {
  children: ReactNode;
  loading?: boolean;
  /** 无数据时的占位（EmptyState / ErrorState） */
  placeholder?: ReactNode;
  isEmpty?: boolean;
  className?: string;
}

/**
 * 表格外壳：统一三种 sticky 做法、内联 fontSize:12px、
 * 以及"表格容器没有滚动区"的问题。
 */
function DataTableShell({
  children,
  loading = false,
  placeholder,
  isEmpty = false,
  className,
}: DataTableShellProps) {
  return (
    <div className={`relative flex-1 overflow-auto ${className ?? ""}`}>
      {isEmpty && placeholder ? placeholder : children}
      {loading ? <LoadingState overlay label="正在读取数据…" /> : null}
    </div>
  );
}

export default DataTableShell;
