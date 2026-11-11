import type { ReactNode } from "react";
import ActionButton from "./ActionButton";
import FormField from "./FormField";
import Modal from "./Modal";

export interface PromptDialogProps {
  open: boolean;
  title: string;
  titleId?: string;
  /** 标题下方的说明区（例如"键：xxx"） */
  description?: ReactNode;
  label: string;
  htmlFor: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputType?: "text" | "number" | "password";
  min?: string;
  autoFocus?: boolean;
  confirmText?: string;
  confirmIcon?: ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 「输入一个值再确认」的弹窗（原 Redis 设置过期时间弹窗的内联实现）。
 * 行为与原来一致：取消/遮罩关闭走 onCancel，确认按钮可显示 loading。
 */
function PromptDialog({
  open,
  title,
  titleId,
  description,
  label,
  htmlFor,
  help,
  value,
  onChange,
  placeholder,
  inputType = "text",
  min,
  autoFocus = true,
  confirmText = "确定",
  confirmIcon,
  busy = false,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      titleId={titleId}
      bodyClassName="space-y-2"
      onClose={onCancel}
      footer={
        <>
          <ActionButton onClick={onCancel} disabled={busy}>
            取消
          </ActionButton>
          <ActionButton
            variant="primary"
            icon={confirmIcon}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmText}
          </ActionButton>
        </>
      }
    >
      {description}
      <FormField label={label} htmlFor={htmlFor} help={help}>
        {/* biome-ignore lint/a11y/noAutofocus: 弹窗打开即聚焦唯一输入框，与拆分前的原生行为一致 */}
        <input
          id={htmlFor}
          name={htmlFor}
          type={inputType}
          inputMode={inputType === "number" ? "numeric" : undefined}
          aria-label={label}
          className="input h-8 w-full text-xs"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={min}
          autoFocus={autoFocus}
        />
      </FormField>
    </Modal>
  );
}

export default PromptDialog;
