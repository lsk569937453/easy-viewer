import { FaCopy } from "react-icons/fa";
import ActionButton from "../ui/ActionButton";
import JsonCell from "../ui/JsonCell";
import { formatJsonValue } from "./redisKeyUtils";

const JSON_PRE_CLASS =
  "max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-control)] bg-base-200/60 p-1.5 font-mono text-[11px] leading-relaxed";
const PLAIN_TEXT_CLASS = "break-all font-mono text-[11px]";

export interface RedisStringValueProps {
  raw: string;
  onCopy: (value: string) => void;
}

/** 字符串类型的整值展示：JSON 美化、复制与超长截断。 */
export function RedisStringValue({ raw, onCopy }: RedisStringValueProps) {
  const text = formatJsonValue(raw) ?? String(raw);
  const maxLen = 10000;

  return (
    <div className="flex flex-col gap-1.5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-micro text-base-content/45">字符串值</span>
        <ActionButton
          variant="icon"
          title="复制值"
          aria-label="复制值"
          onClick={() => onCopy(raw)}
          icon={<FaCopy size="0.75em" aria-hidden="true" />}
        />
      </div>
      {text === "" ? (
        <p className="text-xs text-base-content/40">（空字符串）</p>
      ) : (
        <pre className="whitespace-pre-wrap break-all rounded-[var(--radius-control)] border border-hairline bg-base-200/40 p-2 font-mono text-xs leading-relaxed">
          {text.length > maxLen ? `${text.slice(0, maxLen)}…` : text}
        </pre>
      )}
    </div>
  );
}

export interface RedisPlainCellProps {
  cell: string | null;
}

/** 键/索引/字段列：纯文本，保持紧凑。 */
export function RedisPlainCell({ cell }: RedisPlainCellProps) {
  return <span className="break-all font-mono text-[11px]">{cell ?? "—"}</span>;
}

export interface RedisTableCellProps {
  cell: string | null;
  onCopy: (value: string) => void;
}

/** 值列：JSON 格式化（复用 ui/JsonCell）+ 复制。 */
export function RedisTableCell({ cell, onCopy }: RedisTableCellProps) {
  if (cell === null || cell === undefined) {
    return <span className="text-base-content/30">（空）</span>;
  }

  const strValue = String(cell);

  if (formatJsonValue(strValue)) {
    return (
      <div className="group relative">
        <JsonCell value={strValue} preClassName={JSON_PRE_CLASS} />
        <ActionButton
          variant="icon"
          className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          title="复制单元格内容"
          aria-label="复制单元格内容"
          onClick={() => onCopy(strValue)}
          icon={<FaCopy size="0.7em" aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <JsonCell
      value={strValue}
      maxLength={500}
      textClassName={PLAIN_TEXT_CLASS}
    />
  );
}
