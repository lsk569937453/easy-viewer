import type { RefObject } from "react";
import DialogShell from "./DialogShell";

interface CreateCollectionDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 新建 Collection 弹窗。 */
function CreateCollectionDialog({
  dialogRef,
  value,
  onChange,
  onCancel,
  onConfirm,
}: CreateCollectionDialogProps) {
  return (
    <DialogShell
      dialogRef={dialogRef}
      titleId="create-collection-dialog-title"
      title="新建 Collection"
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
        <label className="label" htmlFor="new-collection-name">
          <span className="text-xs font-medium">Collection 名称</span>
        </label>
        <input
          id="new-collection-name"
          name="collectionName"
          type="text"
          placeholder="例如：orders_2024…"
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

export default CreateCollectionDialog;
