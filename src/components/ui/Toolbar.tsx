import type { ReactNode } from "react";

export interface ToolbarProps {
  /** 左侧主内容（搜索、筛选、统计） */
  left?: ReactNode;
  /** 右侧操作区 */
  right?: ReactNode;
  /** 直接作为左侧内容插入的简写 */
  children?: ReactNode;
  className?: string;
}

/**
 * 面板工具条：替代 Kafka/RocketMQ/ES/Redis 四处逐字重复的
 * `flex-shrink-0 border-b ... px-4 py-3 bg-base-200/30` 容器。
 */
function Toolbar({ left, right, children, className }: ToolbarProps) {
  return (
    <div className={`app-toolbar ${className ?? ""}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
        {left}
        {children}
      </div>
      {right ? (
        <div className="flex flex-shrink-0 items-center gap-1.5">{right}</div>
      ) : null}
    </div>
  );
}

export default Toolbar;
