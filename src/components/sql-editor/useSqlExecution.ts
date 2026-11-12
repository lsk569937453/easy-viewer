import { useCallback, useEffect, useMemo, useState } from "react";
import { backendErrorText } from "../../api/ddl";
import { exeSql } from "../../api/sql";
import type { ExeSqlResponse } from "../../types/backend";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";

export type TableRowData = Record<string, string | null>;

export interface UseSqlExecutionOptions {
  connectionId: number;
}

export interface UseSqlExecutionResult {
  executionTime: number;
  allFetchedData: TableRowData[];
  columns: { name: string }[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (message: string | null) => void;
  filteredData: TableRowData[];
  displayData: TableRowData[];
  totalPages: number;
  executeSql: (sqlContent: string) => Promise<void>;
  handlePageChange: (newPage: number) => void;
}

/**
 * SQL 执行与结果状态：执行、列/行结果、搜索、分页、错误与 loading。
 * 与原 `SqlEditorTabContent` 内联 handler 逐字等价（含全部中文文案与日志）。
 */
export function useSqlExecution({
  connectionId,
}: UseSqlExecutionOptions): UseSqlExecutionResult {
  const [executionTime, setExecutionTime] = useState(0);
  const [allFetchedData, setAllFetchedData] = useState<TableRowData[]>([]);
  const [columns, setColumns] = useState<{ name: string }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return allFetchedData;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allFetchedData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm),
      ),
    );
  }, [allFetchedData, searchTerm]);

  const displayData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const executeSql = useCallback(
    async (sqlContent: string) => {
      if (!sqlContent.trim()) {
        setError("SQL 查询不能为空。");
        return;
      }
      setIsLoading(true);
      setError(null);
      setAllFetchedData([]);
      setColumns([]);
      setExecutionTime(0);
      setTotalRows(0);
      setCurrentPage(1);
      setSearchTerm(""); // 执行查询时清空搜索词

      try {
        const listNodeInfoReqObject = {
          level_infos: [
            {
              level: 0,
              config_value: connectionId.toString(),
            },
          ],
        };

        const responseJson = await exeSql(sqlContent, listNodeInfoReqObject);
        const parsed = parseBaseResponse<ExeSqlResponse>(responseJson);
        const { response_code, response_msg } = parsed;

        if (response_code === 0) {
          const rawHeaders = response_msg.header;
          const rawRows = response_msg.rows;

          const fetchedColumns = rawHeaders.map((col) => ({
            name: col.name,
          }));

          const fetchedColumnHeadersNames = fetchedColumns.map(
            (col) => col.name,
          );

          const fetchedData: TableRowData[] = rawRows.map((rowArray) => {
            const rowObject: TableRowData = {};
            rowArray.forEach((value, index) => {
              const headerName = fetchedColumnHeadersNames[index];
              if (headerName) {
                rowObject[headerName] = value;
              }
            });
            return rowObject;
          });

          setColumns(fetchedColumns);
          setAllFetchedData(fetchedData);
          // exe_sql 响应不包含 execution_time_ms（见 src-tauri/src/vojo/exe_sql_response.rs），保持为 0
          setExecutionTime(0);
          setCurrentPage(1);
        } else {
          throw new Error(
            backendErrorText(
              parsed.error,
              response_msg || "未能获取查询结果或响应格式不正确",
            ),
          );
        }
      } catch (err) {
        console.error("SQL execution failed:", err);
        setError(`执行 SQL 失败: ${getErrorMessage(err)}`);
        setColumns([]);
        setAllFetchedData([]);
        setTotalRows(0);
        setExecutionTime(0);
        setCurrentPage(1);
      } finally {
        setIsLoading(false);
      }
    },
    [connectionId],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setTotalRows(filteredData.length);
  }, [filteredData]);

  const totalPages = Math.ceil(totalRows / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  return {
    executionTime,
    allFetchedData,
    columns,
    totalRows,
    currentPage,
    pageSize,
    searchTerm,
    setSearchTerm,
    isLoading,
    setIsLoading,
    error,
    setError,
    filteredData,
    displayData,
    totalPages,
    executeSql,
    handlePageChange,
  };
}
