import { useEffect, useState } from "react";
import { fetchShowColumns } from "../../services/tree";
import type { ShowColumnsResponse } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import {
  buildColumnInfo,
  type ColumnInfo,
  matchColumnRow,
} from "../../utils/columnInfo";
import { getErrorMessage } from "../../utils/error";

export interface ColumnDetailState {
  columnInfo: ColumnInfo | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 列详情加载：`show_columns` → 按列名匹配行 → 构造展示模型。
 * 与原 `ColumnDetailPage` 内联 effect 行为一致（匹配失败时用节点描述兜底）。
 */
export function useColumnDetail(
  activeTabNode: TreeNode | null | undefined,
  tableName?: string,
): ColumnDetailState {
  const [columnInfo, setColumnInfo] = useState<ColumnInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColumnDetails = async () => {
      if (!activeTabNode?.path) {
        setError("无法加载列详情：缺少必要信息。");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const responseJson = await fetchShowColumns({
          level_infos: activeTabNode.path,
        });
        const { response_code, response_msg } =
          parseBaseResponse<ShowColumnsResponse>(responseJson);

        if (response_code !== 0) {
          setError("无法获取列信息。");
          return;
        }

        const row = matchColumnRow(
          response_msg.header,
          response_msg.rows,
          activeTabNode.name,
        );
        setColumnInfo(
          buildColumnInfo({
            node: activeTabNode,
            tableName,
            headers: response_msg.header,
            row,
          }),
        );
      } catch (err) {
        setError(`加载失败: ${getErrorMessage(err) || "未知错误"}`);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchColumnDetails();
  }, [activeTabNode, tableName]);

  return { columnInfo, isLoading, error };
}
