import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { FaFolder, FaFile } from "react-icons/fa";
import { showSuccess, showError } from "../utils/showToast.jsx";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function S3UploadPanel({ tab }) {
  const [isUploading, setIsUploading] = useState(false);
  const [singleProgress, setSingleProgress] = useState({ uploaded: 0, total: 0 });
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: "" });
  const node = tab.node;
  const bucketName = node.name;
  const unlistenRef = useRef(null);

  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  const handleUploadFile = async () => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (!selected) return;

      setIsUploading(true);
      setSingleProgress({ uploaded: 0, total: 0 });

      // 监听进度事件
      unlistenRef.current = await listen("s3-upload-progress", (event) => {
        setSingleProgress({
          uploaded: event.payload.uploaded,
          total: event.payload.total,
        });
      });

      const responseJson = await invoke("upload_file_with_progress", {
        listNodeInfoReq: { level_infos: node.path },
        localFilePath: selected,
      });

      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      if (responseJson) {
        showSuccess("文件上传成功!");
      }
    } catch (err) {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      showError(`文件上传失败: ${err.message || err.toString()}`);
    } finally {
      setIsUploading(false);
      setSingleProgress({ uploaded: 0, total: 0 });
    }
  };

  const handleUploadFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;

      setIsUploading(true);

      const filesJson = await invoke("list_local_folder_files", {
        localDirectory: selected,
      });
      const files = JSON.parse(filesJson);
      const total = files.length;

      if (total === 0) {
        showSuccess("文件夹为空，无需上传。");
        setIsUploading(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileName = filePath.split(/[/\\]/).pop();
        setProgress({ current: i + 1, total, fileName });

        try {
          const responseJson = await invoke("upload_file", {
            listNodeInfoReq: { level_infos: node.path },
            localFilePath: filePath,
          });
          const { response_code } = JSON.parse(responseJson);
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
        showSuccess(`全部 ${total} 个文件上传成功!`);
      } else {
        showSuccess(`上传完成: ${successCount} 成功, ${failCount} 失败`);
      }
    } catch (err) {
      showError(`文件夹上传失败: ${err.message || err.toString()}`);
    } finally {
      setIsUploading(false);
      setProgress({ current: 0, total: 0, fileName: "" });
    }
  };

  const singlePercent = singleProgress.total > 0 ? Math.round((singleProgress.uploaded / singleProgress.total) * 100) : 0;
  const folderPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const showSingleProgress = isUploading && singleProgress.total > 0;
  const showFolderProgress = isUploading && progress.total > 0;

  return (
    <div className="flex flex-col h-full bg-base-100 p-6">
      <h2 className="text-xl font-bold mb-1">上传到 Bucket</h2>
      <p className="text-sm text-base-content/60 mb-6">
        目标: <span className="font-semibold text-base-content">{bucketName}</span>
      </p>

      <div className="flex flex-col gap-4 max-w-md">
        <button
          className="btn btn-primary btn-outline gap-2"
          onClick={handleUploadFile}
          disabled={isUploading}
        >
          <FaFile />
          选择文件上传
        </button>

        <button
          className="btn btn-secondary btn-outline gap-2"
          onClick={handleUploadFolder}
          disabled={isUploading}
        >
          <FaFolder />
          选择文件夹上传
        </button>
      </div>

      {showSingleProgress && (
        <div className="mt-6 max-w-md">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-base-content/60">上传中</span>
            <span className="text-base-content/80 font-semibold">
              {formatBytes(singleProgress.uploaded)} / {formatBytes(singleProgress.total)} ({singlePercent}%)
            </span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={singleProgress.uploaded}
            max={singleProgress.total}
          ></progress>
        </div>
      )}

      {showFolderProgress && (
        <div className="mt-6 max-w-md">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-base-content/60 truncate max-w-[60%]" title={progress.fileName}>
              {progress.fileName}
            </span>
            <span className="text-base-content/80 font-semibold">
              {progress.current}/{progress.total} ({folderPercent}%)
            </span>
          </div>
          <progress
            className="progress progress-secondary w-full"
            value={progress.current}
            max={progress.total}
          ></progress>
        </div>
      )}
    </div>
  );
}

export default S3UploadPanel;
