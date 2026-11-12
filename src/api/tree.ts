import type { ListNodeInfoReq } from "../types/backend";
import { BACKEND_COMMANDS, callBackend } from "./client";

/** 树节点相关命令。参数名与 `src-tauri/src/service/cmd.rs` 的入参一致。 */
export const listNodeInfo = (
  listNodeInfoReq: ListNodeInfoReq,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.listNodeInfo, { listNodeInfoReq });

export const fetchServerVersion = (baseConfigId: number): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.getServerVersion, { baseConfigId });

export const fetchDdl = (listNodeInfoReq: ListNodeInfoReq): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.getDdl, { listNodeInfoReq });

export const fetchShowColumns = (
  listNodeInfoReq: ListNodeInfoReq,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.showColumns, { listNodeInfoReq });

export const fetchObjectInfo = (
  listNodeInfoReq: ListNodeInfoReq,
  isFolder: boolean,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.getObjectInfo, {
    listNodeInfoReq,
    isFolder,
  });

export interface RenameObjectParams {
  listNodeInfoReq: ListNodeInfoReq;
  newName: string;
  isFolder: boolean;
}

export const renameObject = ({
  listNodeInfoReq,
  newName,
  isFolder,
}: RenameObjectParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.renameObject, {
    listNodeInfoReq,
    newName,
    isFolder,
  });

export interface CopyObjectParams {
  listNodeInfoReq: ListNodeInfoReq;
  targetDir: string;
  isFolder: boolean;
}

export const copyObject = ({
  listNodeInfoReq,
  targetDir,
  isFolder,
}: CopyObjectParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.copyObject, {
    listNodeInfoReq,
    targetDir,
    isFolder,
  });

export const createCollection = (
  listNodeInfoReq: ListNodeInfoReq,
  collectionName: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.createCollection, {
    listNodeInfoReq,
    collectionName,
  });

export const createBucket = (
  listNodeInfoReq: ListNodeInfoReq,
  bucketName: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.createBucket, {
    listNodeInfoReq,
    bucketName,
  });

export const deleteBucket = (
  listNodeInfoReq: ListNodeInfoReq,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.deleteBucket, { listNodeInfoReq });

export const downloadNodeFile = (
  listNodeInfoReq: ListNodeInfoReq,
  destination: string,
  isFolder = false,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.downloadFile, {
    listNodeInfoReq,
    destination,
    isFolder,
  });

export const uploadNodeFile = (
  listNodeInfoReq: ListNodeInfoReq,
  localFilePath: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.uploadFile, {
    listNodeInfoReq,
    localFilePath,
  });

export const uploadNodeFileWithProgress = (
  listNodeInfoReq: ListNodeInfoReq,
  localFilePath: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.uploadFileWithProgress, {
    listNodeInfoReq,
    localFilePath,
  });

export const listLocalFolderFiles = (localDirectory: string): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.listLocalFolderFiles, {
    localDirectory,
  });
