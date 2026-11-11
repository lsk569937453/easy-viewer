import { useEffect, useState } from "react";
import { exeSql } from "../../services/sql";
import type { ExeSqlResponse, ListNodeInfoReq } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";
import {
  firstRowOf,
  generateIndexColumnsQuery,
  generateIndexCreateSqlQuery,
  generateIndexInfoQuery,
  type IndexColumn,
  type IndexInfo,
  mapIndexColumnRows,
  mapIndexInfoRow,
} from "../../utils/indexSql";

export interface IndexDetailState {
  indexInfo: IndexInfo | null;
  indexColumns: IndexColumn[];
  createIndexSql: string;
  isLoading: boolean;
  error: string | null;
}

type ParsedSql =
  | { ok: true; payload: ExeSqlResponse }
  | { ok: false; message: string };

/** 只解析不抛错：单段失败时按原行为「打日志继续」。 */
const parseExeSql = (responseJson: string): ParsedSql => {
  const { response_code, response_msg } =
    parseBaseResponse<ExeSqlResponse>(responseJson);
  if (response_code === 0) {
    return { ok: true, payload: response_msg };
  }
  return { ok: false, message: String(response_msg) };
};

/**
 * 索引详情加载：依次拉「索引列 → 创建 SQL → 基本信息」。
 * 保留拆分前的容错语义：单段 response_code 非 0 只记录日志、不中断后续请求；
 * 仅网络/调用异常才进入 error 态。
 */
export function useIndexDetail(
  activeTabNode: TreeNode | null | undefined,
  tableName?: string,
): IndexDetailState {
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null);
  const [indexColumns, setIndexColumns] = useState<IndexColumn[]>([]);
  const [createIndexSql, setCreateIndexSql] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndexDetails = async () => {
      if (!activeTabNode?.path || !tableName) {
        setError("无法加载索引详情：缺少必要信息。");
        console.error("IndexDetailPage: Missing required data", {
          activeTabNode,
          tableName,
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      const listNodeInfoReq: ListNodeInfoReq = {
        level_infos: activeTabNode.path,
      };
      const indexName = activeTabNode.name;

      try {
        const columnsJson = await exeSql(
          generateIndexColumnsQuery(tableName, indexName),
          listNodeInfoReq,
        );
        const columnsResult = parseExeSql(columnsJson);
        if (columnsResult.ok && columnsResult.payload.rows) {
          setIndexColumns(mapIndexColumnRows(columnsResult.payload.rows));
        } else if (!columnsResult.ok) {
          console.error("IndexDetailPage: Failed to get index columns", {
            message: columnsResult.message,
          });
        }

        const createSqlJson = await exeSql(
          generateIndexCreateSqlQuery(tableName, indexName),
          listNodeInfoReq,
        );
        const createSqlResult = parseExeSql(createSqlJson);
        const createSqlRow = createSqlResult.ok
          ? firstRowOf(createSqlResult.payload)
          : undefined;
        if (createSqlRow) {
          setCreateIndexSql(createSqlRow[0] || "-- 无法生成创建索引的 SQL");
        } else {
          console.error("IndexDetailPage: Failed to get create SQL", {
            createMsg: createSqlResult.ok
              ? createSqlResult.payload
              : createSqlResult.message,
          });
        }

        const infoJson = await exeSql(
          generateIndexInfoQuery(tableName, indexName),
          listNodeInfoReq,
        );
        const infoResult = parseExeSql(infoJson);
        const infoRow = infoResult.ok
          ? firstRowOf(infoResult.payload)
          : undefined;
        if (infoRow) {
          setIndexInfo(
            mapIndexInfoRow(infoRow, { name: indexName, tableName }),
          );
        } else {
          console.error("IndexDetailPage: Failed to get index info", {
            infoMsg: infoResult.ok ? infoResult.payload : infoResult.message,
          });
        }
      } catch (err) {
        console.error("获取索引详情失败:", err);
        setError(`加载失败: ${getErrorMessage(err) || "未知错误"}`);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchIndexDetails();
  }, [activeTabNode, tableName]);

  return { indexInfo, indexColumns, createIndexSql, isLoading, error };
}
