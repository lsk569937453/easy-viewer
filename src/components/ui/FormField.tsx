import type { ReactNode } from "react";

export interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  /** 辅助说明，与 error 同时存在时优先显示 error */
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 表单字段：替代 daisyUI 4 时代那套已失效的表单包装类，
 * 不依赖主题实现，29 个主题下表现一致。
 */
function FormField({
  label,
  htmlFor,
  required = false,
  help,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label
        className="text-xs font-medium text-base-content/70"
        htmlFor={htmlFor}
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-error" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-micro text-error">{error}</p>
      ) : help ? (
        <p className="text-micro text-base-content/45">{help}</p>
      ) : null}
    </div>
  );
}

export default FormField;
