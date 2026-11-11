import { FaRegWindowMaximize, FaTimes, FaWindowMinimize } from "react-icons/fa";

const WINDOW_BUTTON_CLASS =
  "app-icon-btn h-7 w-7 rounded-[var(--radius-control)]";

interface WindowControlsProps {
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

/** 标题栏右侧窗口按钮：最小化 / 最大化还原 / 关闭。 */
function WindowControls({
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  return (
    <div className="flex flex-none items-center gap-0.5" data-tauri-no-drag>
      <button
        type="button"
        aria-label="最小化窗口"
        title="最小化"
        className={WINDOW_BUTTON_CLASS}
        onClick={onMinimize}
      >
        <FaWindowMinimize size="0.72em" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="最大化或还原窗口"
        title="最大化 / 还原"
        className={WINDOW_BUTTON_CLASS}
        onClick={onToggleMaximize}
      >
        <FaRegWindowMaximize size="0.72em" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="关闭窗口"
        title="关闭"
        className={`${WINDOW_BUTTON_CLASS} hover:bg-error hover:text-error-content`}
        onClick={onClose}
      >
        <FaTimes size="0.72em" aria-hidden="true" />
      </button>
    </div>
  );
}

export default WindowControls;
