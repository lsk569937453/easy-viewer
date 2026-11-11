import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { FaFile, FaFolder } from "react-icons/fa";
import {
  listLocalFolderFiles,
  uploadNodeFile,
  uploadNodeFileWithProgress,
} from "../services/tree";
import type { S3UploadTab } from "../types/tab";
import {
  parseBaseResponse,
  parseLocalFolderFiles,
} from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import UploadTaskBody, { UploadHintPanel } from "./s3-upload/UploadTaskBody";
import {
  computePercent,
  resolveUploadStatus,
  type UploadResult,
} from "./s3-upload/uploadStatus";
import { useUploadProgress } from "./s3-upload/useUploadProgress";
import ActionButton from "./ui/ActionButton";
import PageHeader from "./ui/PageHeader";
import Panel from "./ui/Panel";
import StatusChip from "./ui/StatusChip";

interface UploadTarget {
  kind: "file" | "folder";
  path: string;
}

interface S3UploadPanelProps {
  tab: S3UploadTab;
}

function S3UploadPanel({ tab }: S3UploadPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [lastTarget, setLastTarget] = useState<UploadTarget | null>(null);
  const {
    singleProgress,
    progress,
    setSingleProgress,
    setProgress,
    attachProgressListener,
    detachProgressListener,
  } = useUploadProgress();

  const node = tab.node;
  const bucketName = node.name;
  const isBucketTarget = node.iconName === "bucket";

  const performFileUpload = async (filePath: string) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    setSingleProgress({ uploaded: 0, total: 0 });
    try {
      // 监听进度事件
      await attachProgressListener();

      const responseJson = await uploadNodeFileWithProgress(
        { level_infos: node.path },
        filePath,
      );

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
      const filesJson = await listLocalFolderFiles(directory);
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
          const responseJson = await uploadNodeFile(
            { level_infos: node.path },
            filePath,
          );
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

  const singlePercent = computePercent(
    singleProgress.uploaded,
    singleProgress.total,
  );
  const folderPercent = computePercent(progress.current, progress.total);
  const status = resolveUploadStatus({ isUploading, error, result });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={isBucketTarget ? "上传到 Bucket" : "上传文件"}
        subtitle={`目标：${bucketName}`}
        meta={
          <StatusChip tone={status.tone} dot>
            {status.text}
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
            <UploadTaskBody
              error={error}
              isUploading={isUploading}
              singleProgress={singleProgress}
              progress={progress}
              singlePercent={singlePercent}
              folderPercent={folderPercent}
              result={result}
              onRetry={lastTarget ? handleRetry : undefined}
            />
          </Panel>

          <UploadHintPanel />
        </div>
      </div>
    </div>
  );
}

export default S3UploadPanel;
