import type { RefObject } from "react";
import DialogShell from "./DialogShell";

interface CreateBucketDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 新建 Bucket 弹窗。 */
function CreateBucketDialog({
  dialogRef,
  value,
  onChange,
  onCancel,
  onConfirm,
}: CreateBucketDialogProps) {
  return (
    <DialogShell
      dialogRef={dialogRef}
      titleId="create-bucket-dialog-title"
      title="新建 Bucket"
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
            创建
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5 w-full mt-4">
        <label className="label" htmlFor="new-bucket-name">
          <span className="text-xs font-medium">Bucket 名称</span>
        </label>
        <input
          id="new-bucket-name"
          name="bucketName"
          type="text"
          placeholder="例如：backup-2024…"
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

export default CreateBucketDialog;
