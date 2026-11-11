import type { ReactNode } from "react";

export interface PanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * 面板外框：统一的 surface + 1px hairline + panel 圆角 + 极轻阴影。
 * 布局方向（flex/grid）由调用方用工具类决定，这里只负责"表面"。
 */
function Panel({ children, className }: PanelProps) {
  return (
    <div className={className ? `app-panel ${className}` : "app-panel"}>
      {children}
    </div>
  );
}

export default Panel;
