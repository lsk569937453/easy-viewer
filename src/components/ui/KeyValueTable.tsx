import type { ReactNode } from "react";

export interface KeyValueRow {
  label: ReactNode;
  value: ReactNode;
}

export interface KeyValueTableProps {
  rows: KeyValueRow[];
  /** 标签列宽度，默认 9rem */
  labelWidth?: string;
  className?: string;
}

/**
 * 键值表：S3 对象、索引详情、列详情、Kafka 分区详情原有 4 份各自实现。
 */
function KeyValueTable({
  rows,
  labelWidth = "9rem",
  className,
}: KeyValueTableProps) {
  return (
    <table
      className={`w-full border-collapse text-xs ${className ?? ""}`}
      style={{ tableLayout: "fixed" }}
    >
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={index}
            className="border-b border-hairline-soft last:border-b-0"
          >
            <th
              scope="row"
              className="whitespace-nowrap px-2 py-1.5 text-left align-top font-normal text-base-content/45"
              style={{ width: labelWidth }}
            >
              {row.label}
            </th>
            <td className="break-words px-2 py-1.5 align-top text-base-content/80">
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default KeyValueTable;
