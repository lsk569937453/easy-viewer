// src/components/AboutModal.tsx
import { useEffect, useRef } from "react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 关于页面模态框组件。
 */
function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 用 showModal() 打开，才能获得焦点捕获、Esc 关闭与 aria-modal 语义
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // 如果 isOpen 为 false，则不渲染模态框
  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      id="about_modal"
      className="modal"
      aria-labelledby="about-title"
      onClose={onClose}
    >
      <div className="modal-box max-w-lg bg-base-100 shadow-xl rounded-lg p-6">
        {/* 模态框标题 */}
        <h2
          id="about-title"
          className="font-bold text-2xl text-primary mb-4 border-b border-base-content/20 pb-2"
        >
          关于 DB Viewer
        </h2>

        {/* 模态框内容 */}
        <div className="py-4 space-y-3">
          <p className="text-lg">
            <strong>应用名称：</strong>{" "}
            <span className="text-info">DB Viewer</span>
          </p>
          <p className="text-lg">
            <strong>版本：</strong> <span className="text-accent">v1.0.0</span>
          </p>
          <p className="text-base text-neutral-content">
            一个轻量级的桌面数据库查看器，旨在提供直观的数据浏览和管理体验。
          </p>
          <p className="text-sm text-base-content/70">
            <strong>技术栈：</strong> 使用{" "}
            <span className="font-semibold">Tauri</span>,{" "}
            <span className="font-semibold">React</span>,{" "}
            <span className="font-semibold">Tailwind CSS</span>,{" "}
            <span className="font-semibold">DaisyUI</span> 构建。
          </p>
          <p className="text-sm text-base-content/70">
            <strong>版权所有：</strong> &copy; 2023 DB Viewer. 保留所有权利。
          </p>
        </div>

        {/* 模态框底部动作区 */}
        <div className="modal-action mt-6">
          {/* form method="dialog" 会自动关闭 <dialog> 元素 */}
          <form method="dialog" onSubmit={onClose}>
            <button type="submit" className="btn btn-primary">
              关闭
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="关闭对话框">close</button>
      </form>
    </dialog>
  );
}

export default AboutModal;
