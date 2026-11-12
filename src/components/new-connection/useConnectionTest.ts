import { useState } from "react";
import { testConnection } from "../../api/connections";
import type { BaseConfig } from "../../types/backend";
import { parseBaseResponse } from "../../utils/backendResponse";
import {
  buildBaseConfigEnum,
  type ConnectionDraft,
  type TestResult,
} from "../../utils/connectionForm";
import { getErrorMessage } from "../../utils/error";

export interface ConnectionTestApi {
  isTesting: boolean;
  testResult: TestResult;
  testMessage: string;
  confirmWeakSave: boolean;
  setConfirmWeakSave: (open: boolean) => void;
  setTestResult: (result: TestResult) => void;
  /** 清空测试结果（关闭弹窗、重选文件时）。 */
  resetTestResult: () => void;
  /** 等价于原 resetForm 对测试状态的清理。 */
  resetTestState: () => void;
  handleTestConnection: (
    draft: ConnectionDraft,
    setError: (message: string) => void,
  ) => Promise<void>;
}

/** 连接测试相关的瞬时状态与提交处理器（确认对话框由调用方渲染）。 */
export function useConnectionTest(): ConnectionTestApi {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [testMessage, setTestMessage] = useState("");
  // 连接测试失败时是否仍要保存：用对话框确认，替代 window.confirm
  const [confirmWeakSave, setConfirmWeakSave] = useState(false);

  const resetTestResult = () => {
    setTestResult(null);
    setTestMessage("");
  };

  const resetTestState = () => {
    setIsTesting(false);
    resetTestResult();
  };

  const handleTestConnection = async (
    draft: ConnectionDraft,
    setError: (message: string) => void,
  ) => {
    setError("");
    setTestResult(null);
    setTestMessage("");
    setIsTesting(true);

    try {
      const testDatabaseRequest: BaseConfig = {
        base_config_enum: buildBaseConfigEnum(draft, "test"),
      };

      const responseJson = await testConnection(testDatabaseRequest);
      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        setTestResult("success");
        setTestMessage("连接测试成功！");
      } else {
        setTestResult("failure");
        setTestMessage(`连接测试失败: ${response_msg}`);
      }
    } catch (err) {
      setTestResult("failure");
      const errorMessage = `连接测试异常: ${getErrorMessage(err)}`;
      setTestMessage(errorMessage);
      setError(errorMessage);
      console.error("连接测试异常:", err);
    } finally {
      setIsTesting(false);
    }
  };

  return {
    isTesting,
    testResult,
    testMessage,
    confirmWeakSave,
    setConfirmWeakSave,
    setTestResult,
    resetTestResult,
    resetTestState,
    handleTestConnection,
  };
}
