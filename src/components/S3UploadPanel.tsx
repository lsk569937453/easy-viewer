import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FaFile, FaFolder, FaUpload } from "react-icons/fa";
import type { S3UploadTab } from "../types/tab";
import {
  parseBaseResponse,
  parseLocalFolderFiles,
} from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import ActionButton from "./ui/ActionButton";
import PageHeader from "./ui/PageHeader";
import Panel from "./ui/Panel";
import StatusChip, { type StatusTone } from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";

interface S3UploadProgressPayload {
  uploaded: number;
  total: number;
}

interface SingleProgress {
  uploaded: number;
  total: number;
}

interface FolderProgress {
  current: number;
  total: number;
  fileName: string;
}

interface UploadTarget {
  kind: "file" | "folder";
  path: string;
}

interface UploadResult {
  tone: "success" | "warning";
  text: string;
}

interface S3UploadPanelProps {
  tab: S3UploadTab;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

interface UploadProgressProps {
  label: ReactNode;
  /** 右侧数值说明（字节数 / 文件序号） */
  detail: string;
  percent: number;
  ariaLabel: string;
}

/** 进度条：base-200 轨道 + primary 填充，百分比由 StatusChip 呈现 */
function UploadProgress({
  label,
  detail,
  percent,
  ariaLabel,
}: UploadProgressProps) {
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

function S3UploadPanel({ tab }: S3UploadPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [singleProgress, setSingleProgress] = useState<SingleProgress>({
    uploaded: 0,
    total: 0,
  });
  const [progress, setProgress] = useState<FolderProgress>({
    current: 0,
    total: 0,
    fileName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [lastTarget, setLastTarget] = useState<UploadTarget | null>(null);
  const node = tab.node;
  const bucketName = node.name;
  const isBucketTarget = node.iconName === "bucket";
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const detachProgressListener = () => {
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      detachProgressListener();
    };
  }, []);

  const performFileUpload = async (filePath: string) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    setSingleProgress({ uploaded: 0, total: 0 });
    try {
      // 监听进度事件
      detachProgressListener();
      unlistenRef.current = await listen<S3UploadProgressPayload>(
        "s3-upload-progress",
        (event) => {
          setSingleProgress({
            uploaded: event.payload.uploaded,
            total: event.payload.total,
          });
        },
      );

      const responseJson = await invoke<string>("upload_file_with_progress", {
        listNodeInfoReq: { level_infos: node.path },
        localFilePath: filePath,
      });

      detachProgressListener();

      if (responseJson) {
        showSuccess("文件上传成功!");
        setResult({ tone: "success", text: "文件上传成功" });
      }
    } catch (err) {
      detachProgressListener();
      const message = `文件上传失败: ${getErrorMessage(err)}`;
      setError(message);
      showError(message);
    } finally {
      setIsUploading(false);
      setSingleProgress({ uploaded: 0, total: 0 });
    }
  };

  const performFolderUpload = async (directory: string) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: 0, fileName: "" });
    try {
      const filesJson = await invoke<string>("list_local_folder_files", {
        localDirectory: directory,
      });
      const files = parseLocalFolderFiles(filesJson);
      const total = files.length;

      if (total === 0) {
        showSuccess("文件夹为空，无需上传。");
        setResult({
          tone: "warning",
          text: "所选文件夹为空，没有需要上传的文件",
        });
        return;
      }

      let successCount = 0;
      let failCount = 0;
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileName = filePath.split(/[/\\]/).pop() ?? "";
        setProgress({ current: i + 1, total, fileName });

        try {
          const responseJson = await invoke<string>("upload_file", {
            listNodeInfoReq: { level_infos: node.path },
            localFilePath: filePath,
          });
          const { response_code } = parseBaseResponse<null>(responseJson);
          if (response_code === 0) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        showSuccess(`全部 ${total} 个文件上传成功！`);
        setResult({ tone: "success", text: `全部 ${total} 个文件上传成功` });
      } else {
        const message = `上传完成：${successCount} 个成功，${failCount} 个失败`;
        showError(message);
        setResult({ tone: "warning", text: message });
      }
    } catch (err) {
      const message = `文件夹上传失败: ${getErrorMessage(err)}`;
      setError(message);
      showError(message);
    } finally {
      setIsUploading(false);
      setProgress({ current: 0, total: 0, fileName: "" });
    }
  };

  const handleUploadFile = async () => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (!selected) return;
      setLastTarget({ kind: "file", path: selected });
      await performFileUpload(selected);
    } catch (err) {
      setLastTarget(null);
      const message = `文件上传失败: ${getErrorMessage(err)}`;
      setError(message);
      showError(message);
    }
  };

  const handleUploadFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;
      setLastTarget({ kind: "folder", path: selected });
      await performFolderUpload(selected);
    } catch (err) {
      setLastTarget(null);
      const message = `文件夹上传失败: ${getErrorMessage(err)}`;
      setError(message);
      showError(message);
    }
  };

  const handleRetry = () => {
    if (!lastTarget) return;
    if (lastTarget.kind === "file") {
      void performFileUpload(lastTarget.path);
    } else {
      void performFolderUpload(lastTarget.path);
    }
  };

  const singlePercent =
    singleProgress.total > 0
      ? Math.round((singleProgress.uploaded / singleProgress.total) * 100)
      : 0;
  const folderPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const statusText = isUploading
    ? "上传中"
    : error
      ? "上传失败"
      : result
        ? result.tone === "success"
          ? "已完成"
          : "已结束"
        : "待上传";
  const statusTone: StatusTone = isUploading
    ? "info"
    : error
      ? "error"
      : result
        ? result.tone
        : "neutral";

  const renderTaskBody = () => {
    if (error) {
      return (
        <ErrorState
          title="上传失败"
          description={error}
          onRetry={lastTarget ? handleRetry : undefined}
        />
      );
    }
    if (isUploading && singleProgress.total > 0) {
      return (
        <UploadProgress
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
        <UploadProgress
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
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={isBucketTarget ? "上传到 Bucket" : "上传文件"}
        subtitle={`目标：${bucketName}`}
        meta={
          <StatusChip tone={statusTone} dot>
            {statusText}
          </StatusChip>
        }
        actions={
          <>
            <ActionButton
              size="sm"
              variant="primary"
              icon={<FaFile size="0.85em" aria-hidden="true" />}
              disabled={isUploading}
              onClick={() => void handleUploadFile()}
            >
              选择文件
            </ActionButton>
            <ActionButton
              size="sm"
              icon={<FaFolder size="0.85em" aria-hidden="true" />}
              disabled={isUploading}
              onClick={() => void handleUploadFolder()}
            >
              选择文件夹
            </ActionButton>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="max-w-2xl space-y-3">
          <Panel className="p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold">上传任务</h3>
              <span className="text-micro text-base-content/45">
                {isBucketTarget ? "Bucket" : "文件夹"}：{bucketName}
              </span>
            </div>
            {renderTaskBody()}
          </Panel>

          <Panel className="p-3">
            <h3 className="text-[13px] font-semibold">上传说明</h3>
            <ul className="mt-1.5 space-y-1 text-micro leading-relaxed text-base-content/50">
              <li>
                单文件上传通过 s3-upload-progress 事件按字节实时刷新进度。
              </li>
              <li>文件夹上传按文件串行提交，单个文件失败后会继续后续文件。</li>
              <li>失败后点击「重试」会重新提交上一次选择的目标。</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default S3UploadPanel;
