import type { ChangeEvent, KeyboardEvent } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import ActionButton from "./ActionButton";

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** 回车或点击搜索按钮时触发 */
  onSubmit?: () => void;
  /** 提供则渲染右侧"搜索"按钮；RedisKeyDetailPanel 的死按钮由此修复 */
  submitLabel?: string;
  onClear?: () => void;
  className?: string;
}

/**
 * 统一搜索框：原来 4 处 `join` 拼装各不相同，
 * 其中 RedisKeyDetailPanel 的搜索按钮恒为 disabled（死交互）。
 */
function SearchBox({
  value,
  onChange,
  placeholder = "搜索…",
  ariaLabel,
  onSubmit,
  submitLabel,
  onClear,
  className,
}: SearchBoxProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (event.key === "Escape" && value) {
      event.preventDefault();
      onChange("");
      onClear?.();
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <div className="relative min-w-0 flex-1">
        <FaSearch
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-micro text-base-content/35"
          aria-hidden="true"
        />
        <input
          type="text"
          className="input h-8 w-full rounded-[var(--radius-control)] border-hairline bg-base-200/60 pl-7 pr-7 text-xs focus-visible:border-primary/50"
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          value={value}
          autoComplete="off"
          spellCheck={false}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
          onKeyDown={handleKeyDown}
        />
        {value ? (
          <button
            type="button"
            className="app-icon-btn absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2"
            title="清空"
            aria-label="清空搜索"
            onClick={() => {
              onChange("");
              onClear?.();
            }}
          >
            <FaTimes size="0.7em" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {submitLabel ? (
        <ActionButton variant="secondary" size="sm" onClick={onSubmit}>
          {submitLabel}
        </ActionButton>
      ) : null}
    </div>
  );
}

export default SearchBox;
