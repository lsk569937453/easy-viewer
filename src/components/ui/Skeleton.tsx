import { TABLE_CLASS } from "./DataTableShell";

export interface TableSkeletonProps {
  headers: readonly string[];
  rows?: number;
}

/** 表格占位骨架：表头用真实列名，单元格用 daisyUI `skeleton` 条。 */
export const TableSkeleton = ({ headers, rows = 5 }: TableSkeletonProps) => (
  <table className={TABLE_CLASS}>
    <thead>
      <tr>
        {headers.map((header) => (
          <th key={header}>{header}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {headers.map((header) => (
            <td key={header}>
              <div className="skeleton h-3 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export interface ParagraphSkeletonProps {
  lines?: number;
  className?: string;
}

/** 多行文本占位骨架（DDL、详情正文等）。 */
export const ParagraphSkeleton = ({
  lines = 5,
  className = "space-y-2 p-3",
}: ParagraphSkeletonProps) => (
  <div className={className}>
    {Array.from({ length: lines }, (_, index) => (
      <div
        key={index}
        className={`skeleton h-3 ${
          index === lines - 1 && lines > 1 ? "w-10/12" : "w-full"
        }`}
      />
    ))}
  </div>
);
