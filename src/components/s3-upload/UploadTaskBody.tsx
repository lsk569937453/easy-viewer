import { FaUpload } from "react-icons/fa";
import { formatBytes } from "../../utils/format";
import Panel from "../ui/Panel";
import ProgressBar from "../ui/ProgressBar";
import StatusChip from "../ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "../ui/states";
import type { UploadResult } from "./uploadStatus";
import type { FolderProgress, SingleProgress } from "./useUploadProgress";

export interface UploadTaskBodyProps {
  error: string | null;
  isUploading: boolean;
  singleProgress: SingleProgress;
  progress: FolderProgress;
  singlePercent: number;
  folderPercent: number;
  result: UploadResult | null;
  onRetry?: () => void;
}

/**
 * 上传任务区内容：失败 → 单文件进度 → 文件夹进度 → 准备中 → 结果 → 空态。
 * 顺序与文案沿用拆分前 renderTaskBody。
 */
function UploadTaskBody({
  error,
  isUploading,
  singleProgress,
  progress,
  singlePercent,
  folderPercent,
  result,
  onRetry,
}: UploadTaskBodyProps) {
  if (error) {
    return (
      <ErrorState title="上传失败" description={error} onRetry={onRetry} />
    );
  }
  if (isUploading && singleProgress.total > 0) {
    return (
      <ProgressBar
        label="当前文件"
        detail={`${formatBytes(singleProgress.uploaded)} / ${formatBytes(
          singleProgress.total,
        )}`}
        percent={singlePercent}
        ariaLabel="文件上传进度"
      />
    );
  }
  if (isUploading && progress.total > 0) {
    return (
      <ProgressBar
        label={progress.fileName || "正在上传"}
        detail={`${progress.current}/${progress.total} 个`}
        percent={folderPercent}
        ariaLabel="文件夹上传进度"
      />
    );
  }
  if (isUploading) {
    return <LoadingState label="正在准备上传…" />;
  }
  if (result) {
    return (
      <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-hairline bg-base-200/40 px-2.5 py-2">
        <StatusChip tone={result.tone}>
          {result.tone === "success" ? "成功" : "完成"}
        </StatusChip>
        <span className="min-w-0 break-words text-xs text-base-content/70">
          {result.text}
        </span>
      </div>
    );
  }
  return (
    <EmptyState
      compact
      title="暂无上传任务"
      description="选择文件或文件夹后，上传进度与结果会显示在这里。"
      icon={<FaUpload size="1.6em" aria-hidden="true" />}
    />
  );
}

/** 上传说明面板：三条静态规则，文案与拆分前一致。 */
export function UploadHintPanel() {
  return (
    <Panel className="p-3">
      <h3 className="text-[13px] font-semibold">上传说明</h3>
      <ul className="mt-1.5 space-y-1 text-micro leading-relaxed text-base-content/50">
        <li>单文件上传通过 s3-upload-progress 事件按字节实时刷新进度。</li>
        <li>文件夹上传按文件串行提交，单个文件失败后会继续后续文件。</li>
        <li>失败后点击「重试」会重新提交上一次选择的目标。</li>
      </ul>
    </Panel>
  );
}

export default UploadTaskBody;
