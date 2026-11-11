import { useEffect, useState } from "react";

/**
 * 输入防抖：`value` 停止变化 `delayMs` 后才返回新值。
 * 原表工作区、左侧树搜索、树展开态持久化各写了一套 setTimeout 逻辑。
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
