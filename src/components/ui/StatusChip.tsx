import type { ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/12 text-error",
};

export interface StatusChipProps {
  tone?: StatusTone;
  children: ReactNode;
  /** 左侧圆点，用于在线/离线一类状态 */
  dot?: boolean;
  className?: string;
  title?: string;
}

/** 状态/类型小胶囊：替代 badge 乱用与 /30~/80 六档不透明度。 */
function StatusChip({
  tone = "neutral",
  children,
  dot = false,
  className,
  title,
}: StatusChipProps) {
  return (
    <span
      className={["app-chip", TONE_CLASS[tone], className]
        .filter(Boolean)
        .join(" ")}
      title={title}
    >
      {dot ? (
        <span
          className="h-1 w-1 flex-shrink-0 rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

export default StatusChip;
