import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

interface S3UploadProgressPayload {
  uploaded: number;
  total: number;
}

export interface SingleProgress {
  uploaded: number;
  total: number;
}

export interface FolderProgress {
  current: number;
  total: number;
  fileName: string;
}

export interface UploadProgressController {
  singleProgress: SingleProgress;
  progress: FolderProgress;
  setSingleProgress: (value: SingleProgress) => void;
  setProgress: (value: FolderProgress) => void;
  /** 订阅 s3-upload-progress（重复调用会先解绑上一次监听） */
  attachProgressListener: () => Promise<void>;
  detachProgressListener: () => void;
}

/**
 * S3 上传进度：单文件走 `s3-upload-progress` 事件按字节刷新，
 * 文件夹走「当前文件/总数」。组件卸载时自动解绑监听，
 * 与拆分前 useEffect 清理里的行为一致。
 */
export function useUploadProgress(): UploadProgressController {
  const [singleProgress, setSingleProgress] = useState<SingleProgress>({
    uploaded: 0,
    total: 0,
  });
  const [progress, setProgress] = useState<FolderProgress>({
    current: 0,
    total: 0,
    fileName: "",
  });
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

  const attachProgressListener = async () => {
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
  };

  return {
    singleProgress,
    progress,
    setSingleProgress,
    setProgress,
    attachProgressListener,
    detachProgressListener,
  };
}
