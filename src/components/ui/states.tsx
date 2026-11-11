import type { ReactNode } from "react";
import { FaExclamationTriangle, FaInbox, FaRedo } from "react-icons/fa";
import ActionButton from "./ActionButton";

/* ============================================================
   三态：空态 / 加载态 / 错误态
   原来 13 个面板里有 9 处逐字重复的加载文案、4 份复制粘贴的
   12 行内联错误 SVG、9 种空态变体，全部收敛到这里。
   ============================================================ */

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** 主行动点（如"新建连接"） */
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-1.5 text-center ${
        compact ? "px-3 py-4" : "px-4 py-10"
      } ${className ?? ""}`}
    >
      <span className="text-base-content/25" aria-hidden="true">
        {icon ?? <FaInbox size="1.6em" />}
      </span>
      <p className="text-[13px] font-medium text-base-content/70">{title}</p>
      {description ? (
        <p className="max-w-[20rem] text-micro leading-relaxed text-base-content/45">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}

export interface LoadingStateProps {
  label?: ReactNode;
  /** 覆盖在容器上的半透明遮罩 */
  overlay?: boolean;
  className?: string;
}

export function LoadingState({
  label = "正在加载…",
  overlay = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 ${
        overlay ? "absolute inset-0 z-10 bg-base-100/80" : "px-4 py-10 flex-col"
      } ${className ?? ""}`}
    >
      <span
        className="loading loading-spinner loading-sm text-primary"
        aria-hidden="true"
      />
      <span className="text-micro text-base-content/50">{label}</span>
    </div>
  );
}

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "加载失败",
  description,
  onRetry,
  retryLabel = "重试",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-[var(--radius-control)] border border-error/30 bg-error/5 px-3 py-2 ${
        className ?? ""
      }`}
    >
      <FaExclamationTriangle
        className="mt-0.5 flex-shrink-0 text-error/80"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-error">{title}</p>
        {description ? (
          <p className="mt-0.5 break-words text-micro text-base-content/60">
            {description}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <ActionButton
          size="xs"
          variant="ghost"
          onClick={onRetry}
          icon={<FaRedo size="0.8em" aria-hidden="true" />}
        >
          {retryLabel}
        </ActionButton>
      ) : null}
    </div>
  );
}
