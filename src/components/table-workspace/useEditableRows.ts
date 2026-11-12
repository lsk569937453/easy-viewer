import { useCallback, useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { deleteTableRow, updateRecord } from "../../api/sql";
import type { TreeNodePathSegment } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";
import { showError, showSuccess } from "../../utils/showToast";
import { buildChangeSqls } from "./changeSql";
import type { EditableRow } from "./types";

export interface UseEditableRowsOptions {
  tableName: string;
  tablePath: TreeNodePathSegment[];
  baseConfigId: number;
}

export interface UseEditableRowsResult {
  tableData: EditableRow[];
  columnHeaders: string[];
  hasChanges: boolean;
  rowPendingDelete: EditableRow | null;
  deleting: boolean;
  setLoadedRows: (columnHeaders: string[], rows: EditableRow[]) => void;
  clearRows: () => void;
  handleCellInput: (
    rowId: string | null,
    columnId: string | null,
    value: unknown,
  ) => void;
  handleCellChange: (
    originalRow: EditableRow,
    columnId: string,
    value: string | null,
  ) => void;
  handleAddRow: (pageSize: number, setPage: (page: number) => void) => void;
  handleSaveChanges: () => Promise<void>;
  handleCancelChanges: () => void;
  requestDeleteRow: (row: EditableRow) => void;
  cancelDeleteRow: () => void;
  confirmDeleteRow: (reload: () => Promise<void>) => Promise<void>;
}

/**
 * 可编辑表格的耦合核心：当前数据 / 原始数据 / 脏标记 / 增删改。
 * 从 `TableWorkspacePanel` 内联状态与 handler 原样搬出，行为与文案不变。
 */
export function useEditableRows({
  tableName,
  tablePath,
  baseConfigId,
}: UseEditableRowsOptions): UseEditableRowsResult {
  const [tableData, setTableData] = useState<EditableRow[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTableData, setOriginalTableData] = useState<EditableRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [rowPendingDelete, setRowPendingDelete] = useState<EditableRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const dataChanged =
      JSON.stringify(tableData) !== JSON.stringify(originalTableData);
    setHasChanges(dataChanged || isEditing);
  }, [tableData, originalTableData, isEditing]);

  const setLoadedRows = useCallback(
    (headers: string[], rows: EditableRow[]) => {
      setTableData(rows);
      setColumnHeaders(headers);
      setOriginalTableData(structuredClone(rows)); // 深拷贝，作为原始数据
      setIsEditing(false);
    },
    [],
  );

  const clearRows = useCallback(() => {
    setTableData([]);
    setColumnHeaders([]);
    setOriginalTableData([]);
  }, []);

  const handleCellInput = useCallback(
    (rowId: string | null, _columnId: string | null, _value: unknown) => {
      setIsEditing(!!rowId);
    },
    [],
  );

  const handleCellChange = useCallback(
    (originalRow: EditableRow, columnId: string, value: string | null) => {
      setTableData((prevTableData) => {
        const rowIndex = prevTableData.findIndex(
          (r) => r.id === originalRow.id,
        );
        if (rowIndex === -1) {
          return prevTableData; // 未找到则返回之前的状态
        }

        const updatedData = [...prevTableData]; // 创建新数组以避免直接修改状态
        updatedData[rowIndex] = {
          ...updatedData[rowIndex],
          [columnId]: value,
        };
        return updatedData; // 返回新状态
      });
    },
    [],
  );

  // 添加新行
  const handleAddRow = useCallback(
    (pageSize: number, setPage: (page: number) => void) => {
      const newRow: EditableRow = { id: "" };
      columnHeaders.forEach((col) => {
        newRow[col] = "";
      });
      newRow.id = uuid(); // 给新行一个唯一ID
      setTableData([...tableData, newRow]);

      setPage(Math.ceil((tableData.length + 1) / pageSize));
    },
    [tableData, columnHeaders],
  );

  // 删除改为「确认对话框 + 提交」，替换原来的 window.confirm 阻塞式确认
  const requestDeleteRow = useCallback((rowToDelete: EditableRow) => {
    setRowPendingDelete(rowToDelete);
  }, []);

  const cancelDeleteRow = useCallback(() => {
    setRowPendingDelete(null);
  }, []);

  const confirmDeleteRow = useCallback(
    async (reload: () => Promise<void>) => {
      const rowToDelete = rowPendingDelete;
      if (!rowToDelete) return;

      setDeleting(true);
      try {
        const idColumn = columnHeaders[0]; // 使用第一列作为标识列
        const realRowId = rowToDelete[idColumn]; // 获取真实的主键值
        const responseJson = await deleteTableRow({
          baseConfigId,
          tableName,
          rowId: realRowId,
          idColumn,
          listNodeInfoReq: { level_infos: tablePath },
        });
        const { response_code, response_msg } =
          parseBaseResponse<null>(responseJson);

        if (response_code === 0) {
          showSuccess("数据删除成功！");
          setRowPendingDelete(null);
          // 删除成功后，重新获取数据以更新UI和原始数据状态
          await reload();
        } else {
          showError(`数据删除失败: ${response_msg}`);
        }
      } catch (error) {
        showError(`删除数据时发生错误！${getErrorMessage(error)}`);
      } finally {
        setDeleting(false);
      }
    },
    [rowPendingDelete, columnHeaders, baseConfigId, tableName, tablePath],
  );

  // 保存修改
  const handleSaveChanges = useCallback(async () => {
    // 对比 tableData 和 originalTableData，生成 UPDATE/INSERT SQL
    const sqls = buildChangeSqls(
      tableName,
      columnHeaders,
      tableData,
      originalTableData,
    );

    if (sqls.length === 0) {
      showError("没有检测到变更。");
      return;
    }

    try {
      const responseJson = await updateRecord({ level_infos: tablePath }, sqls);
      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        setOriginalTableData(structuredClone(tableData));
        setIsEditing(false);
        showSuccess("数据保存成功！");
      } else {
        showError(`数据保存失败: ${response_msg}`);
        console.error("Save failed:", response_msg);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      showError(`保存数据时发生错误: ${getErrorMessage(error)}`);
    }
  }, [tableName, columnHeaders, tableData, originalTableData, tablePath]);

  // 取消修改，将 tableData 恢复到 originalTableData
  const handleCancelChanges = useCallback(() => {
    setTableData(structuredClone(originalTableData)); // 深拷贝原始数据，恢复到当前数据
    setIsEditing(false);
  }, [originalTableData]);

  return {
    tableData,
    columnHeaders,
    hasChanges,
    rowPendingDelete,
    deleting,
    setLoadedRows,
    clearRows,
    handleCellInput,
    handleCellChange,
    handleAddRow,
    handleSaveChanges,
    handleCancelChanges,
    requestDeleteRow,
    cancelDeleteRow,
    confirmDeleteRow,
  };
}
