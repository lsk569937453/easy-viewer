import type { ListNodeInfoReq } from "../types/backend";
import { BACKEND_COMMANDS, callBackend } from "./client";

export const fetchIndexDetail = (
  listNodeInfoReq: ListNodeInfoReq,
  indexName: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.elasticsearchIndexDetail, {
    listNodeInfoReq,
    indexName,
  });

export interface SearchIndexParams {
  listNodeInfoReq: ListNodeInfoReq;
  indexName: string;
  /** 简单搜索关键词（DSL 模式传 null） */
  query: string | null;
  /** 自定义 Query DSL（简单模式传 null） */
  searchQuery: string | null;
  from: number;
  size: number;
}

export const searchIndex = ({
  listNodeInfoReq,
  indexName,
  query,
  searchQuery,
  from,
  size,
}: SearchIndexParams): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.elasticsearchSearch, {
    listNodeInfoReq,
    indexName,
    query,
    searchQuery,
    from,
    size,
  });
