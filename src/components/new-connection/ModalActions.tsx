export interface ModalActionsProps {
  isEditMode: boolean;
  isTesting: boolean;
  isCreating: boolean;
  onTestConnection: () => void;
  onClose: () => void;
}

/** 弹窗底部操作区：测试连接 / 创建（更新）/ 取消。 */
function ModalActions({
  isEditMode,
  isTesting,
  isCreating,
  onTestConnection,
  onClose,
}: ModalActionsProps) {
  return (
    <div className="modal-action mt-6">
      <button
        type="button"
        className={`btn btn-info ${isTesting ? "loading" : ""}`}
        onClick={onTestConnection}
        disabled={isTesting || isCreating}
      >
        {isTesting ? "测试中…" : "测试连接"}
      </button>

      <button
        type="submit"
        className={`btn btn-primary ${isCreating ? "loading" : ""}`}
        disabled={isTesting || isCreating}
      >
        {isCreating
          ? isEditMode
            ? "更新中…"
            : "创建中…"
          : isEditMode
            ? "更新连接"
            : "创建连接"}
      </button>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={onClose}
        disabled={isCreating}
      >
        取消
      </button>
    </div>
  );
}

export default ModalActions;
