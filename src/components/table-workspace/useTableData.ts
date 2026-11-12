import { useCallback, useMemo, useState } from "react";
import { exeSql } from "../../api/sql";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { ExeSqlResponse } from "../../types/backend";
import type { TreeNode } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { mapExeSqlResponse } from "./tableRows";
import type { EditableRow } from "./types";

export interface UseTableDataOptions {
  tableData: EditableRow[];
  activeTabNode: TreeNode;
  onRowsLoaded: (columnHeaders: string[], rows: EditableRow[]) => void;
  onRowsCleared: () => void;
}

export interface UseTableDataResult {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (size: number) => void;
  filteredTableData: EditableRow[];
  totalPages: number;
  paginatedData: EditableRow[];
  fetchTableData: (query?: string) => Promise<void>;
  clearTableData: () => void;
}

/** 表数据加载 + 搜索过滤 + 分页切片（列头与行数据由 `useEditableRows` 持有）。 */
export function useTableData({
  tableData,
  activeTabNode,
  onRowsLoaded,
  onRowsCleared,
}: UseTableDataOptions): UseTableDataResult {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const clearTableData = useCallback(() => {
    onRowsCleared();
    setCurrentPage(1); // 清除数据时重置分页
  }, [onRowsCleared]);

  // 获取表数据
  const fetchTableData = useCallback(
    async (query?: string) => {
      if (!query || !activeTabNode?.path) {
        clearTableData();
        return;
      }

      try {
        const responseJson = await exeSql(query, {
          level_infos: activeTabNode.path,
        });
        const { response_code, response_msg } =
          parseBaseResponse<ExeSqlResponse>(responseJson);

        if (response_code === 0) {
          const { columnHeaders, rows } = mapExeSqlResponse(response_msg);
          onRowsLoaded(columnHeaders, rows);
          setCurrentPage(1);
        } else {
          console.error(
            "DEBUG: Failed to fetch table data or format incorrect:",
            response_msg,
          );
          clearTableData();
        }
      } catch (error) {
        console.error("DEBUG: Error executing SQL query:", error);
        clearTableData();
      }
    },
    [activeTabNode, clearTableData, onRowsLoaded],
  );

  // 根据搜索词过滤数据
  const filteredTableData = useMemo(() => {
    const data = tableData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
      ),
    );
    return data;
  }, [tableData, debouncedSearchTerm]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredTableData.length / itemsPerPage);
  }, [filteredTableData.length, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTableData.slice(startIndex, endIndex);
  }, [filteredTableData, currentPage, itemsPerPage]);

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredTableData,
    totalPages,
    paginatedData,
    fetchTableData,
    clearTableData,
  };
}
