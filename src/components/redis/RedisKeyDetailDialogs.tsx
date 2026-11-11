import { FaClock } from "react-icons/fa";
import ConfirmDialog from "../ui/ConfirmDialog";
import PromptDialog from "../ui/PromptDialog";

export interface RedisKeyDetailDialogsProps {
  keyName: string | undefined;
  actionLoading: boolean;
  showDeleteConfirm: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  showTtlModal: boolean;
  newTtlSeconds: string;
  onTtlSecondsChange: (value: string) => void;
  onCancelTtl: () => void;
  onConfirmTtl: () => void;
}

/** 键详情的两个弹窗：删除确认、设置过期时间。 */
export function RedisKeyDetailDialogs({
  keyName,
  actionLoading,
  showDeleteConfirm,
  onCancelDelete,
  onConfirmDelete,
  showTtlModal,
  newTtlSeconds,
  onTtlSecondsChange,
  onCancelTtl,
  onConfirmTtl,
}: RedisKeyDetailDialogsProps) {
  return (
    <>
      {/* 删除确认 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="删除键"
        description={
          <>
            确定要删除键{" "}
            <span className="break-all font-mono text-base-content/80">
              「{keyName}」
            </span>{" "}
            吗？该操作不可撤销。
          </>
        }
        confirmText="删除"
        tone="danger"
        busy={actionLoading}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />

      {/* 设置过期时间 */}
      <PromptDialog
        open={showTtlModal}
        title="设置过期时间"
        titleId="redis-ttl-title"
        description={
          <p className="break-all text-micro text-base-content/50">
            键：
            <span className="font-mono text-base-content/75">{keyName}</span>
          </p>
        }
        label="过期秒数"
        htmlFor="redis-ttl-seconds"
        help="留空或输入 0 表示移除过期时间（PERSIST）。"
        value={newTtlSeconds}
        onChange={onTtlSecondsChange}
        placeholder="例如 3600（1 小时）"
        inputType="number"
        min="0"
        confirmIcon={<FaClock aria-hidden="true" />}
        busy={actionLoading}
        onConfirm={onConfirmTtl}
        onCancel={onCancelTtl}
      />
    </>
  );
}
