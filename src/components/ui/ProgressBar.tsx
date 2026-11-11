import type { ReactNode } from "react";
import StatusChip from "./StatusChip";

export interface ProgressBarProps {
  label: ReactNode;
  /** 右侧数值说明（字节数 / 文件序号） */
  detail: string;
  percent: number;
  ariaLabel: string;
}

/** 进度条：base-200 轨道 + primary 填充，百分比由 StatusChip 呈现。 */
function ProgressBar({ label, detail, percent, ariaLabel }: ProgressBarProps) {
  return (
    <div className="max-w-md">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span
          className="min-w-0 truncate text-base-content/60"
          title={typeof label === "string" ? label : undefined}
        >
          {label}
        </span>
        <span className="flex flex-shrink-0 items-center gap-1.5">
          <span className="font-mono text-micro tabular-nums text-base-content/55">
            {detail}
          </span>
          <StatusChip tone="info">{percent}%</StatusChip>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-base-200"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
