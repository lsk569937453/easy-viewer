import type { Column, Row } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import type { EditableRow } from "./types";

export interface EditableCellProps {
  getValue: () => unknown;
  row: Row<EditableRow>;
  column: Column<EditableRow, unknown>;
  onCellChange: (
    originalRow: EditableRow,
    columnId: string,
    value: string | null,
  ) => void;
  onCellInput: (
    rowId: string | null,
    columnId: string | null,
    value: unknown,
  ) => void;
}

/** 可编辑单元格：未聚焦时跟随外部数据刷新，失焦时提交草稿。 */
function EditableCell({
  getValue,
  row,
  column,
  onCellChange,
  onCellInput,
}: EditableCellProps) {
  const initialValue = getValue();
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() =>
    initialValue !== null && initialValue !== undefined
      ? String(initialValue)
      : "",
  );

  // 未聚焦时跟随外部数据刷新（重新执行 SQL、新增/删除行后）
  useEffect(() => {
    if (isFocused) return;
    setDraft(
      initialValue !== null && initialValue !== undefined
        ? String(initialValue)
        : "",
    );
  }, [initialValue, isFocused]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const original = String(
      initialValue !== null && initialValue !== undefined ? initialValue : "",
    );
    if (draft !== original) {
      onCellChange(row.original, column.id, draft);
    }
    onCellInput(null, null, null);
  }, [draft, initialValue, onCellChange, onCellInput, row.original, column.id]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onCellInput(row.original.id, column.id, draft);
  }, [onCellInput, row.original.id, column.id, draft]);

  return (
    <textarea
      rows={1}
      wrap={isFocused ? "soft" : "off"}
      aria-label="单元格内容"
      value={draft}
      title={isFocused ? undefined : draft}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(event) => {
        setDraft(event.target.value);
        onCellInput(row.original.id, column.id, event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`w-full resize-none rounded-[3px] bg-transparent px-1 py-0.5 text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
        isFocused
          ? "bg-base-300 whitespace-pre-wrap break-words"
          : "overflow-hidden text-ellipsis"
      }`}
    />
  );
}

export default EditableCell;
