import type { ReactNode, RefObject } from "react";

interface DialogShellProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  onCancel: () => void;
  backdropAriaLabel?: string;
}

/** 保留 DatabaseViewer 原有 `<dialog class="modal">` 结构与关闭方式。 */
function DialogShell({
  dialogRef,
  titleId,
  title,
  children,
  actions,
  onCancel,
  backdropAriaLabel,
}: DialogShellProps) {
  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby={titleId}>
      <div className="modal-box">
        <h3 id={titleId} className="font-bold text-lg">
          {title}
        </h3>
        {children}
        <div className="modal-action">{actions}</div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label={backdropAriaLabel} onClick={onCancel}>
          close
        </button>
      </form>
    </dialog>
  );
}

export default DialogShell;
