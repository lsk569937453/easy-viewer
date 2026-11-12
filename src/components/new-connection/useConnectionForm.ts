import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { fetchBaseConfigById } from "../../api/connections";
import {
  type GetBaseConnectionByIdResponse,
  isUiDbType,
} from "../../types/backend";
import { parseBaseResponse } from "../../utils/backendResponse";
import {
  type ConnectionDraft,
  createInitialDraft,
  generateConnectionName,
  TRADITIONAL_DB_TYPES,
} from "../../utils/connectionForm";
import { getErrorMessage } from "../../utils/error";
import { draftFromConnectionConfig } from "./draftFromConnectionConfig";

export interface UseConnectionFormParams {
  isOpen: boolean;
  editingId?: number | null;
  /** 等价于原 resetForm：清空测试结果、提交中状态（非编辑模式打开时调用）。 */
  resetTransientState: () => void;
  /** 只清空测试结果：关闭弹窗、重新选择 SQLite 文件时使用。 */
  resetTestResult: () => void;
}

export interface ConnectionFormApi {
  draft: ConnectionDraft;
  error: string;
  setError: (message: string) => void;
  updateDraft: (patch: Partial<ConnectionDraft>) => void;
  handleDbTypeChange: (value: string) => void;
  handleSelectSqliteFile: () => Promise<void>;
  isEditMode: boolean;
  canUseHostMode: boolean;
  isKafkaType: boolean;
  isRocketmqType: boolean;
  isS3Type: boolean;
  isWebdavType: boolean;
}

/**
 * 连接表单状态：11 个表单字段收敛为一个 draft 对象，`updateDraft` 走函数式合并，
 * 同一事件/副作用内的多次字段更新与原来的多次 setState 结果一致。
 * 编辑回填与「类型/开关变化时重置」两个副作用保持原顺序与触发条件。
 */
export function useConnectionForm({
  isOpen,
  editingId,
  resetTransientState,
  resetTestResult,
}: UseConnectionFormParams): ConnectionFormApi {
  const [draft, setDraft] = useState<ConnectionDraft>(createInitialDraft);
  const [error, setError] = useState("");
  const isEditMode = !!editingId;

  const updateDraft = (patch: Partial<ConnectionDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const resetForm = () => {
    setDraft(createInitialDraft());
    setError("");
    resetTransientState();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!editingId) {
      resetForm();
      return;
    }
    // 编辑模式：拉取连接详情并回填
    const fetchConnectionDetails = async (baseConfigId: number) => {
      try {
        const jsonResponse = await fetchBaseConfigById(baseConfigId);
        const { response_code, response_msg } =
          parseBaseResponse<GetBaseConnectionByIdResponse>(jsonResponse);

        if (response_code === 0) {
          const { patch, error: populateError } =
            draftFromConnectionConfig(response_msg);
          setDraft((prev) => ({ ...prev, ...patch }));
          if (populateError) setError(populateError);
        } else {
          setError(`获取连接信息失败: ${response_msg}`);
        }
      } catch (err) {
        setError(`获取连接信息时出错: ${getErrorMessage(err)}`);
        console.error("Failed to fetch connection details:", err);
      }
    };

    void fetchConnectionDetails(editingId);
  }, [isOpen, editingId]);

  useEffect(() => {
    // 关闭弹窗时清空连接串与主机相关字段（保持原关闭副作用）
    if (isOpen) return;
    setDraft((prev) => ({
      ...prev,
      connectionString: "",
      connectionMode:
        prev.dbType === "sqlite" || !TRADITIONAL_DB_TYPES.includes(prev.dbType)
          ? "url"
          : prev.connectionMode,
      host: "",
      port: "",
      username: "",
      password: "",
      databaseName: "",
      useTls: true,
    }));
    setError("");
    resetTestResult();
  }, [draft.dbType, isOpen]);

  const handleDbTypeChange = (value: string) => {
    if (!isUiDbType(value)) return;
    setDraft((prev) => ({
      ...prev,
      dbType: value,
      connectionName:
        !isEditMode || value !== prev.dbType
          ? generateConnectionName(value)
          : prev.connectionName,
    }));
  };

  const handleSelectSqliteFile = async () => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (typeof selected === "string" && selected) {
        updateDraft({ connectionString: selected });
        setError("");
        resetTestResult();
      }
    } catch (err) {
      console.error("文件选择失败:", err);
      setError("无法打开文件选择器。");
    }
  };

  return {
    draft,
    error,
    setError,
    updateDraft,
    handleDbTypeChange,
    handleSelectSqliteFile,
    isEditMode,
    canUseHostMode: TRADITIONAL_DB_TYPES.includes(draft.dbType),
    isKafkaType: draft.dbType === "kafka",
    isRocketmqType: draft.dbType === "rocketmq",
    isS3Type: draft.dbType === "s3",
    isWebdavType: draft.dbType === "webdav",
  };
}
