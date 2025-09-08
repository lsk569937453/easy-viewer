// src/components/AboutModal.jsx
import React from "react";

/**
 * 关于页面模态框组件。
 *
 * @param {object} props
 * @param {boolean} props.isOpen - 控制模态框是否可见。
 * @param {function} props.onClose - 关闭模态框的回调函数。
 */
function AboutModal({ isOpen, onClose }) {
  // 如果 isOpen 为 false，则不渲染模态框
  if (!isOpen) {
    return null;
  }

  // 使用 DaisyUI 的 modal 样式
  // `modal-open` 类在 DaisyUI 3.x 及更高版本中通常与 <dialog open> 结合使用
  // 或者在 <dialog> 标签上直接使用 `open` 属性
  return (
    <dialog id="about_modal" className="modal modal-open" open>
      <div className="modal-box max-w-lg bg-base-100 shadow-xl rounded-lg p-6">
        {/* 模态框标题 */}
        <h3 className="font-bold text-2xl text-primary mb-4 border-b border-base-content/20 pb-2">
          关于 DB Viewer
        </h3>

        {/* 模态框内容 */}
        <div className="py-4 space-y-3">
          <p className="text-lg">
            <strong>应用名称:</strong>{" "}
            <span className="text-info">DB Viewer</span>
          </p>
          <p className="text-lg">
            <strong>版本:</strong> <span className="text-accent">v1.0.0</span>{" "}
            {/* 你可以根据实际情况修改版本号 */}
          </p>
          <p className="text-base text-neutral-content">
            一个轻量级的桌面数据库查看器，旨在提供直观的数据浏览和管理体验。
          </p>
          <p className="text-sm text-gray-500">
            <strong>技术栈:</strong> 使用{" "}
            <span className="font-semibold">Tauri</span>,{" "}
            <span className="font-semibold">React</span>,{" "}
            <span className="font-semibold">Tailwind CSS</span>,{" "}
            <span className="font-semibold">DaisyUI</span> 构建。
          </p>
          <p className="text-sm text-gray-500">
            <strong>作者:</strong> [你的公司/名字] {/* 请替换为你的信息 */}
          </p>
          <p className="text-sm text-gray-500">
            <strong>版权所有:</strong> &copy; 2023 [你的公司/名字].
            保留所有权利。 {/* 请替换为你的信息和年份 */}
          </p>
        </div>

        {/* 模态框底部动作区 */}
        <div className="modal-action mt-6">
          {/* form method="dialog" 会自动关闭 <dialog> 元素 */}
          <form method="dialog" onSubmit={onClose}>
            <button className="btn btn-primary">关闭</button>
          </form>
        </div>
      </div>
    </dialog>
  );
}

export default AboutModal;
