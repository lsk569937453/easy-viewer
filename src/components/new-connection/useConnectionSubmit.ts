import { type FormEvent, useState } from "react";
import { saveConnection, updateConnection } from "../../api/connections";
import type {
  SaveConnectionRequest,
  UpdateConnectionRequest,
} from "../../types/backend";
import { parseBaseResponse } from "../../utils/backendResponse";
import {
  buildBaseConfigEnum,
  type ConnectionDraft,
  isFormValid,
  type TestResult,
} from "../../utils/connectionForm";
import { getErrorMessage } from "../../utils/error";
import { showSuccess } from "../../utils/showToast";

export interface UseConnectionSubmitParams {
  isEditMode: boolean;
  editingId?: number | null;
  onSaveSuccess?: (affectedId: number | null, isEditMode: boolean) => void;
  onClose: () => void;
}

export interface ConnectionSubmitContext {
  draft: ConnectionDraft;
  testResult: TestResult;
  setError: (message: string) => void;
  setTestResult: (result: TestResult) => void;
  /** 测试失败时改为弹确认对话框（原 setConfirmWeakSave(true)）。 */
  requestWeakSaveConfirm: () => void;
}

export interface ConnectionSubmitApi {
  isCreating: boolean;
  /** 等价于原 resetForm 对提交状态的清理。 */
  resetSubmitState: () => void;
  handleCreate: (
    event: FormEvent<HTMLFormElement>,
    context: ConnectionSubmitContext,
  ) => Promise<void>;
}

/** 保存/更新连接：校验 → 构建请求体 → 调用后端 → toast + 回调。 */
export function useConnectionSubmit({
  isEditMode,
  editingId,
  onSaveSuccess,
  onClose,
}: UseConnectionSubmitParams): ConnectionSubmitApi {
  const [isCreating, setIsCreating] = useState(false);

  const resetSubmitState = () => {
    setIsCreating(false);
  };

  const handleCreate = async (
    event: FormEvent<HTMLFormElement>,
    {
      draft,
      testResult,
      setError,
      setTestResult,
      requestWeakSaveConfirm,
    }: ConnectionSubmitContext,
  ) => {
    event.preventDefault();
    setError("");
    setTestResult(null);

    if (!isFormValid(draft)) {
      setError("表单信息不完整，请检查必填项。");
      return;
    }

    if (testResult === "failure") {
      // 先弹确认对话框；确认后用 requestSubmit 重新走一遍提交流程
      requestWeakSaveConfirm();
      return;
    }

    setIsCreating(true);

    try {
      const saveRequest: SaveConnectionRequest = {
        base_config: {
          base_config_enum: buildBaseConfigEnum(draft, "save"),
        },
        connection_name: draft.connectionName.trim(),
      };
      const updateRequest: UpdateConnectionRequest = {
        ...saveRequest,
        connection_id: editingId ?? 0, // 编辑模式下 editingId 一定存在
      };

      const responseJson = isEditMode
        ? await updateConnection(updateRequest)
        : await saveConnection(saveRequest);

      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        showSuccess(isEditMode ? "连接更新成功！" : "连接创建成功！");

        // 新建时后端 save_base_config 返回 ()，没有可复用的 id；
        // 编辑时使用传入的 editingId，父组件据此刷新连接列表。
        const affectedId: number | null = isEditMode
          ? (editingId ?? null)
          : null;
        onSaveSuccess?.(affectedId, isEditMode);

        onClose();
      } else {
        setError(`${isEditMode ? "更新" : "创建"}失败: ${response_msg}`);
      }
    } catch (err) {
      setError(
        `${isEditMode ? "更新" : "创建"}时发生错误: ${getErrorMessage(err)}`,
      );
      console.error(`${isEditMode ? "更新" : "创建"}连接异常:`, err);
    } finally {
      setIsCreating(false);
    }
  };

  return { isCreating, resetSubmitState, handleCreate };
}
