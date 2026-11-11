import type { RefObject } from "react";
import type { TreeNode } from "../../../types/tree";
import DialogShell from "./DialogShell";

interface RenameNodeDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  node: TreeNode | null;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** WebDAV 节点重命名弹窗。 */
function RenameNodeDialog({
  dialogRef,
  node,
  value,
  onChange,
  onCancel,
  onConfirm,
}: RenameNodeDialogProps) {
  return (
    <DialogShell
      dialogRef={dialogRef}
      titleId="rename-dialog-title"
      title="重命名"
      onCancel={onCancel}
      actions={
        <>
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={!value.trim() || value.trim() === node?.name}
          >
            确定
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5 w-full mt-4">
        <label className="label" htmlFor="rename-input">
          <span className="text-xs font-medium">新名称</span>
        </label>
        <input
          id="rename-input"
          name="newName"
          type="text"
          placeholder="请输入新名称…"
          autoComplete="off"
          spellCheck={false}
          className="input w-full"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
          }}
          // biome-ignore lint/a11y/noAutofocus: 保持原弹窗打开即聚焦输入框的行为
          autoFocus
        />
      </div>
    </DialogShell>
  );
}

export default RenameNodeDialog;
