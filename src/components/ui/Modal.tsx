import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  titleId?: string;
  /** 弹窗宽度类，默认 max-w-sm */
  maxWidthClassName?: string;
  /** 内容区填充类，默认 space-y-3 */
  bodyClassName?: string;
  children: ReactNode;
  /** 底部操作区；不传则不渲染操作栏 */
  footer?: ReactNode;
  onClose: () => void;
}

/**
 * daisyUI 弹窗外壳（`app-panel modal-box`）。
 * 原 Redis 过期时间弹窗、消息发送弹窗、以及 DatabaseViewer 的多个 `<dialog>`
 * 都是同一套结构，这里统一成受控组件。
 */
function Modal({
  open,
  title,
  titleId,
  maxWidthClassName = "max-w-sm",
  bodyClassName = "space-y-3",
  children,
  footer,
  onClose,
}: ModalProps) {
  if (!open) return null;

  return (
    <dialog className="modal modal-open" aria-labelledby={titleId}>
      <div className={`app-panel modal-box p-0 ${maxWidthClassName}`}>
        <div className="border-b border-hairline px-4 py-3">
          <h3 id={titleId} className="text-[13px] font-semibold">
            {title}
          </h3>
        </div>
        <div className={`px-4 py-3 ${bodyClassName}`}>{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-hairline px-4 py-2.5">
            {footer}
          </div>
        ) : null}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          <span className="sr-only">关闭对话框</span>
        </button>
      </form>
    </dialog>
  );
}

export default Modal;
