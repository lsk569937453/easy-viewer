import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "icon";

export type ActionButtonSize = "xs" | "sm";

export interface ActionButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children"
  > {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  /** 左侧图标（loading 时被 spinner 取代） */
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  primary: "btn btn-primary",
  secondary: "btn",
  ghost: "btn btn-ghost",
  danger: "btn btn-error",
  icon: "app-icon-btn",
};

/**
 * 统一按钮：替代各处手写的 `btn btn-primary` / `btn btn-ghost btn-circle btn-xs`
 * 以及刷新按钮里用字符串拼接 loading 文案的写法。
 */
function ActionButton({
  variant = "secondary",
  size = "sm",
  icon,
  loading = false,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: ActionButtonProps) {
  const classes =
    variant === "icon"
      ? ["app-icon-btn", className].filter(Boolean).join(" ")
      : [...VARIANT_CLASS[variant].split(" "), `btn-${size}`, className]
          .filter(Boolean)
          .join(" ");

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span
          className="loading loading-spinner loading-xs"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export default ActionButton;
