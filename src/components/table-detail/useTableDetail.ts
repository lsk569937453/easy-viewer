import { useEffect, useState } from "react";
import { fetchDdl, fetchShowColumns } from "../../api/tree";
import type { ShowColumnsResponse } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import {
  mapTableColumnRows,
  type TableColumnRow,
} from "../../utils/columnInfo";
import { getErrorMessage } from "../../utils/error";

export interface TableDetailState {
  ddl: string;
  columns: TableColumnRow[];
  isLoading: boolean;
  error: string | null;
}

/**
 * 表详情（DDL + 列信息）的一次性加载。
 * 行为与原 `TableDetailPage` 内联 effect 一致：任一请求失败即清空两侧数据并展示错误。
 */
export function useTableDetail(
  activeTabNode: TreeNode | null | undefined,
): TableDetailState {
  const [ddl, setDdl] = useState("");
  const [columns, setColumns] = useState<TableColumnRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeTabNode?.path) {
        setDdl("");
        setColumns([]);
        setError("无法加载数据：节点信息不完整。");
        return;
      }

      setIsLoading(true);
      setError(null);

      const listNodeInfoReq = { level_infos: activeTabNode.path };

      try {
        const [ddlResponseJson, columnsResponseJson] = await Promise.all([
          fetchDdl(listNodeInfoReq),
          fetchShowColumns(listNodeInfoReq),
        ]);

        const ddlResponse = parseBaseResponse<string>(ddlResponseJson);
        if (ddlResponse.response_code !== 0) {
          throw new Error(`获取 DDL 失败: ${ddlResponse.response_msg}`);
        }
        setDdl(ddlResponse.response_msg);

        const columnsResponse =
          parseBaseResponse<ShowColumnsResponse>(columnsResponseJson);
        if (columnsResponse.response_code !== 0) {
          throw new Error(`获取列信息失败: ${columnsResponse.response_msg}`);
        }
        if (!columnsResponse.response_msg.rows) {
          throw new Error("列数据的格式不正确。");
        }
        setColumns(mapTableColumnRows(columnsResponse.response_msg.rows));
      } catch (err) {
        console.error("获取表详情失败:", err);
        setError(`加载失败: ${getErrorMessage(err) || "未知错误"}`);
        setDdl("");
        setColumns([]);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [activeTabNode]);

  return { ddl, columns, isLoading, error };
}
