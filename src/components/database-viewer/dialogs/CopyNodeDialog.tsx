import type { RefObject } from "react";
import type { TreeNode } from "../../../types/tree";
import DialogShell from "./DialogShell";

interface CopyNodeDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  node: TreeNode | null;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** WebDAV 节点复制弹窗。 */
function CopyNodeDialog({
  dialogRef,
  node,
  value,
  onChange,
  onCancel,
  onConfirm,
}: CopyNodeDialogProps) {
  return (
    <DialogShell
      dialogRef={dialogRef}
      titleId="copy-dialog-title"
      title="复制到其他目录"
      onCancel={onCancel}
      actions={
        <>
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={!value.trim()}
          >
            复制
          </button>
        </>
      }
    >
      <p className="py-1 text-xs text-base-content/60">
        将 “{node?.name}”
        {node?.iconName === "folder" ? "（含全部嵌套内容）" : ""} 复制到以下
        WebDAV 目录，保留原名称；目标已有同名内容时会被覆盖。
      </p>
      <div className="flex flex-col gap-1.5 w-full mt-4">
        <label className="label" htmlFor="copy-target-dir">
          <span className="text-xs font-medium">目标目录</span>
        </label>
        <input
          id="copy-target-dir"
          name="targetDir"
          type="text"
          placeholder="例如：/docs/backup，/ 表示根目录…"
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

export default CopyNodeDialog;
