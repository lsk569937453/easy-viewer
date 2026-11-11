import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import ActionButton from "./ActionButton";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 确认对话框：替代 3 处 window.confirm（阻塞式、样式与 daisyUI 弹窗不一致）。
 * 用原生 <dialog>.showModal 获得焦点陷阱与 Esc 语义。
 */
function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!busy) onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [busy, onCancel]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      role="alertdialog"
      aria-labelledby={titleId}
    >
      <div className="app-panel modal-box max-w-sm p-0">
        <div className="flex items-start gap-2 px-4 pb-3 pt-4">
          <FaExclamationTriangle
            className={`mt-0.5 flex-shrink-0 ${
              tone === "danger" ? "text-error" : "text-primary"
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-[13px] font-semibold">
              {title}
            </h3>
            {description ? (
              <div className="mt-1 break-words text-xs leading-relaxed text-base-content/60">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-hairline px-4 py-2.5">
          <ActionButton size="sm" onClick={onCancel} disabled={busy}>
            {cancelText}
          </ActionButton>
          <ActionButton
            size="sm"
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmText}
          </ActionButton>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" aria-label="关闭对话框" onClick={onCancel}>
          close
        </button>
      </form>
    </dialog>
  );
}

export default ConfirmDialog;
