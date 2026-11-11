import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FaDownload, FaFile, FaFolder } from "react-icons/fa";
import type { GetObjectInfoRes } from "../types/backend";
import type { S3ObjectTab } from "../types/tab";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";

interface S3ObjectPanelProps {
  tab: S3ObjectTab;
}

function S3ObjectPanel({ tab }: S3ObjectPanelProps) {
  const [objectInfo, setObjectInfo] = useState<GetObjectInfoRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const node = tab.node;
  const isFolder = node.iconName === "folder";

  useEffect(() => {
    const fetchObjectInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const responseJson = await invoke<string>("get_object_info", {
          listNodeInfoReq: { level_infos: node.path },
          isFolder: isFolder,
        });
        const { response_code, response_msg } =
          parseBaseResponse<GetObjectInfoRes>(responseJson);
        if (response_code === 0) {
          setObjectInfo(response_msg);
        } else {
          throw new Error(response_msg || "获取对象信息失败");
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchObjectInfo();
  }, [node.path, isFolder]);

  const handleDownload = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const selected = await save({
        title: isFolder ? "选择保存位置" : "保存文件",
      });
      if (!selected) return;

      const responseJson = await invoke<string>("download_file", {
        listNodeInfoReq: { level_infos: node.path },
        destination: selected,
        isFolder: isFolder,
      });
      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);
      if (response_code === 0) {
        showSuccess("下载成功!");
      } else {
        showError(`下载失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`下载失败: ${getErrorMessage(err)}`);
    }
  };

  const bucketName = node.path[1]?.config_value || "";
  const objectPath = node.path
    .slice(2)
    .map((p) => p.config_value)
    .join("/");

  const infoFields = objectInfo
    ? [
        { label: "名称", value: objectInfo.name },
        { label: "大小", value: objectInfo.size },
        { label: "类型", value: objectInfo.content_type || "-" },
        { label: "ETag", value: objectInfo.etag || "-" },
        { label: "最后修改", value: objectInfo.last_modified },
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-base-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        {isFolder ? (
          <FaFolder size="1.5em" className="text-warning" />
        ) : (
          <FaFile size="1.5em" className="text-info" />
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold truncate" title={node.name}>
            {node.name}
          </h2>
          <p
            className="text-xs text-base-content/60 truncate"
            title={`${bucketName} / ${objectPath}`}
          >
            {bucketName} / {objectPath}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center py-12"
        >
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : (
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm">对象信息</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <tbody>
                  {infoFields.map((field) => (
                    <tr key={field.label}>
                      <td className="font-semibold w-32 text-base-content/60">
                        {field.label}
                      </td>
                      <td className="break-all">{field.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          className="btn btn-primary btn-sm gap-2"
          onClick={handleDownload}
          disabled={isLoading}
        >
          <FaDownload />
          下载
        </button>
      </div>
    </div>
  );
}

export default S3ObjectPanel;
