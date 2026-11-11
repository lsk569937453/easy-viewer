import type { ChangeEvent } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

/**
 * 统一分页：原来 4 种写法（`«` + "页 1 / 3" 塞进 join、独立 border-t 分页脚等）。
 */
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  return (
    <div
      className={`flex items-center gap-2 whitespace-nowrap text-micro text-base-content/50 ${
        className ?? ""
      }`}
    >
      {typeof total === "number" ? <span>共 {total} 条</span> : null}

      {onPageSizeChange && pageSizeOptions && pageSize != null ? (
        <label className="flex items-center gap-1">
          <span className="text-base-content/40">每页</span>
          <select
            className="select select-xs h-6 min-h-0 rounded-[var(--radius-control)] border-hairline bg-base-200/60 text-micro"
            value={pageSize}
            aria-label="每页显示条数"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onPageSizeChange(Number(event.target.value))
            }
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="app-icon-btn h-6 w-6"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="上一页"
          title="上一页"
        >
          <FaChevronLeft size="0.65em" aria-hidden="true" />
        </button>
        <span className="px-1 tabular-nums text-base-content/60">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="app-icon-btn h-6 w-6"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="下一页"
          title="下一页"
        >
          <FaChevronRight size="0.65em" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
