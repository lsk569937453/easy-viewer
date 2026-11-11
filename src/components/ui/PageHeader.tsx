import type { ReactNode } from "react";
import { FaChevronLeft } from "react-icons/fa";

export interface PageHeaderProps {
  /** 主标题（节点名、表名、面板名） */
  title: ReactNode;
  /** 副标题：补充说明、SQL、路径 */
  subtitle?: ReactNode;
  /** 标题右侧的行内标记：连接名、类型、数量 */
  meta?: ReactNode;
  /** 右侧操作区 */
  actions?: ReactNode;
  /** 传入则渲染返回按钮 */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}

/**
 * 面板页头：13 个业务面板原来有 6 种写法，统一到这里。
 * 结构固定为 [返回] 标题+标记(+副标题) ……… 操作区。
 */
function PageHeader({
  title,
  subtitle,
  meta,
  actions,
  onBack,
  backLabel = "返回",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-shrink-0 items-center gap-2 border-b border-hairline px-3 py-2 ${
        className ?? ""
      }`}
    >
      {onBack ? (
        <button
          type="button"
          className="app-icon-btn"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
        >
          <FaChevronLeft size="0.85em" aria-hidden="true" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h2 className="truncate text-[13px] font-semibold leading-tight">
            {title}
          </h2>
          {meta ? (
            <div className="flex flex-shrink-0 items-center gap-1 text-micro text-base-content/50">
              {meta}
            </div>
          ) : null}
        </div>
        {subtitle ? (
          <p
            className="mt-0.5 truncate text-micro text-base-content/45"
            title={typeof subtitle === "string" ? subtitle : undefined}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </header>
  );
}

export default PageHeader;
