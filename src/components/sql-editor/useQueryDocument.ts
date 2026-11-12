import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BACKEND_COMMANDS, callBackend } from "../../api/client";
import type { SetActiveTabId, SetTabs, SqlEditorTab } from "../../types/tab";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";

export interface UseQueryDocumentOptions {
  tab: SqlEditorTab;
  setTabs: SetTabs;
  setActiveTabId: SetActiveTabId;
  onQuerySaved?: (queryId: string, newName: string) => void;
  setError: (message: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export interface UseQueryDocumentResult {
  sqlContent: string;
  queryName: string;
  isDirty: boolean;
  handleSqlContentChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleQueryNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSaveQuery: () => Promise<void>;
}

/**
 * 查询文档状态：内容 / 名称 / 脏标记 + 加载与保存。
 * `setTabs` 写回（`updateTabDirtyState`）行为与原实现完全一致。
 */
export function useQueryDocument({
  tab,
  setTabs,
  setActiveTabId,
  onQuerySaved,
  setError,
  setIsLoading,
}: UseQueryDocumentOptions): UseQueryDocumentResult {
  const [sqlContent, setSqlContent] = useState("");
  const [queryName, setQueryName] = useState(tab.name);
  const [isDirty, setIsDirty] = useState(false);

  const connectionId = tab.connectionId;
  const queryId = tab.queryId;
  const databaseName = tab.databaseName;

  const updateTabDirtyState = (dirty: boolean) => {
    setIsDirty(dirty);
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tab.id ? { ...t, isDirty: dirty } : t)),
    );
  };

  useEffect(() => {
    const fetchQueryContent = async () => {
      if (!queryId) {
        setSqlContent(tab.initialSql || "");
        setQueryName(tab.name);
        updateTabDirtyState(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const responseJson = await callBackend<string>(
          BACKEND_COMMANDS.getQuery,
          {
            connectionId: connectionId,
            queryName: tab.name,
            databaseName: databaseName || undefined,
          },
        );
        const { response_code, response_msg } =
          parseBaseResponse<string>(responseJson);

        if (response_code === 0) {
          setSqlContent(response_msg || "");
          setQueryName(tab.name);
          updateTabDirtyState(false);
        } else {
          throw new Error(response_msg || "未能获取查询内容或响应格式不正确");
        }
      } catch (err) {
        console.error("Failed to load query content:", err);
        setError(`加载查询内容失败: ${getErrorMessage(err)}`);
        setSqlContent("");
        updateTabDirtyState(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueryContent();
  }, [queryId, tab.id, tab.name, connectionId, databaseName, setTabs]);

  const handleSqlContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSqlContent(e.target.value);
    if (!isDirty) {
      updateTabDirtyState(true);
    }
  };

  const handleQueryNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQueryName(e.target.value);
    if (!isDirty) {
      updateTabDirtyState(true);
    }
  };

  const handleSaveQuery = useCallback(async () => {
    if (!sqlContent.trim()) {
      setError("SQL 查询不能为空，无法保存。");
      return;
    }

    const savePromise = callBackend<string>(BACKEND_COMMANDS.saveQuery, {
      connectionId: connectionId,
      queryName: queryName,
      sql: sqlContent,
      databaseName: databaseName || undefined,
    });

    toast.promise(savePromise, {
      loading: "正在保存...",
      success: (responseJson) => {
        const { response_code, response_msg } =
          parseBaseResponse<string>(responseJson);
        if (response_code !== 0) {
          throw new Error(response_msg || "保存失败，但未收到错误详情。");
        }

        const prevQueryId = queryId; // 保存操作前的 queryId
        const savedQueryId = response_msg; // 后端返回的 query id
        const nameChanged = tab.name !== queryName; // 检查当前输入框中的名称是否与tab的当前名称不同

        updateTabDirtyState(false);

        const newTabId = `sql-editor-${savedQueryId}`;

        // 更新 Tab 面板自身的名称和ID
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === tab.id && t.type === "sqlEditor"
              ? {
                  ...t,
                  queryId: savedQueryId,
                  id: newTabId,
                  name: queryName,
                }
              : t,
          ),
        );

        // 同步更新 activeTabId，防止 tab body 消失
        if (setActiveTabId) {
          setActiveTabId(newTabId);
        }

        // 如果名称发生变化且存在有效的 queryId，则通知 DatabaseViewer 更新树节点
        if (savedQueryId && nameChanged) {
          if (onQuerySaved) {
            onQuerySaved(savedQueryId, queryName);
          }
        } else if (!prevQueryId && savedQueryId) {
          // 新查询首次保存
        }

        return "查询已成功保存!";
      },
      error: (err: unknown) =>
        `保存失败: ${getErrorMessage(err) || "未知错误"}`,
    });
  }, [
    sqlContent,
    queryName,
    connectionId,
    queryId,
    databaseName,
    tab.id,
    tab.name,
    setTabs,
    onQuerySaved,
    setActiveTabId,
  ]);

  return {
    sqlContent,
    queryName,
    isDirty,
    handleSqlContentChange,
    handleQueryNameChange,
    handleSaveQuery,
  };
}
