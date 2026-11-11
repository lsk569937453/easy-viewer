import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FaDownload, FaFile, FaFolder } from "react-icons/fa";
import type { GetObjectInfoRes } from "../types/backend";
import type { S3ObjectTab } from "../types/tab";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { showError, showSuccess } from "../utils/showToast";
import ActionButton from "./ui/ActionButton";
import KeyValueTable from "./ui/KeyValueTable";
import PageHeader from "./ui/PageHeader";
import Panel from "./ui/Panel";
import StatusChip from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";

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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={node.name}
        subtitle={`${bucketName} / ${objectPath}`}
        meta={
          <StatusChip>
            {isFolder ? (
              <FaFolder aria-hidden="true" />
            ) : (
              <FaFile aria-hidden="true" />
            )}
            {isFolder ? "文件夹" : "文件"}
          </StatusChip>
        }
        actions={
          <ActionButton
            size="sm"
            variant="primary"
            icon={<FaDownload aria-hidden="true" />}
            onClick={() => void handleDownload()}
            disabled={isLoading}
          >
            下载
          </ActionButton>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {isLoading ? (
          <LoadingState label="正在读取对象信息…" />
        ) : error ? (
          <ErrorState title="读取失败" description={error} />
        ) : infoFields.length === 0 ? (
          <EmptyState
            title="没有对象信息"
            description="该对象没有返回可展示的属性。"
          />
        ) : (
          <Panel className="p-3">
            <KeyValueTable labelWidth="6rem" rows={infoFields} />
          </Panel>
        )}
      </div>
    </div>
  );
}

export default S3ObjectPanel;
