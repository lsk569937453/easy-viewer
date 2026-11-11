import type { RefObject } from "react";
import type { TreeNode } from "../../../types/tree";
import DialogShell from "./DialogShell";

interface DeleteNodeDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  node: TreeNode | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 删除确认弹窗：保留原有节点类型文案与按钮样式。 */
function DeleteNodeDialog({
  dialogRef,
  node,
  onCancel,
  onConfirm,
}: DeleteNodeDialogProps) {
  return (
    <DialogShell
      dialogRef={dialogRef}
      titleId="delete-dialog-title"
      title="确认删除"
      backdropAriaLabel="关闭对话框"
      onCancel={onCancel}
      actions={
        <>
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-error" onClick={onConfirm}>
            确认删除
          </button>
        </>
      }
    >
      <p className="py-4">
        <span className="font-semibold">
          {node?.iconName === "singleQuery"
            ? "查询"
            : node?.iconName === "bucket"
              ? "Bucket"
              : node?.iconName === "folder"
                ? "文件夹"
                : node?.iconName === "textFile"
                  ? "文件"
                  : "连接"}{" "}
          “{node?.name}”
        </span>
        此操作不可撤销。
      </p>
    </DialogShell>
  );
}

export default DeleteNodeDialog;
