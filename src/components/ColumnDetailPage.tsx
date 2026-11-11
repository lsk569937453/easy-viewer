import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { ShowColumnsResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import { TABLE_CLASS } from "./ui/DataTableShell";
import KeyValueTable from "./ui/KeyValueTable";
import StatusChip from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: string | null;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  extra: string | null;
  tableName: string;
  rawInfo: Record<string, string> | null;
}

interface ColumnDetailPageProps {
  activeTabNode?: TreeNode | null;
  tableName?: string;
}

function ColumnDetailPage({ activeTabNode, tableName }: ColumnDetailPageProps) {
  const [columnInfo, setColumnInfo] = useState<ColumnInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColumnDetails = async () => {
      if (!activeTabNode?.path) {
        setError("无法加载列详情：缺少必要信息。");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const listNodeInfoReq = { level_infos: activeTabNode.path };
        const responseJson = await invoke<string>("show_columns", {
          listNodeInfoReq,
        });
        const { response_code, response_msg } =
          parseBaseResponse<ShowColumnsResponse>(responseJson);

        if (response_code === 0) {
          const headers = response_msg.header.map((h) => h.name);
          const targetColumnName = activeTabNode.name;

          // 从所有行中找到匹配的列
          const matchedRow = response_msg.rows.find((row) => {
            const nameIdx = headers.findIndex(
              (h) =>
                h.toLowerCase() === "field" ||
                h.toLowerCase() === "name" ||
                h.toLowerCase() === "column_name",
            );
            return nameIdx >= 0 && row[nameIdx] === targetColumnName;
          });

          if (matchedRow) {
            // 动态构建列信息对象
            const info: Record<string, string> = {};
            headers.forEach((header, idx) => {
              const cell = matchedRow[idx];
              info[header] = cell ?? "NULL";
            });

            // 提取通用字段（不同数据库 header 名不同）
            const getValueByHeaderKeys = (keys: string[]): string | null => {
              for (const key of keys) {
                const found = Object.keys(info).find(
                  (h) => h.toLowerCase() === key.toLowerCase(),
                );
                if (found) return info[found];
              }
              return null;
            };

            const isPrimaryKey =
              activeTabNode.iconName === "primary" ||
              getValueByHeaderKeys(["key"]) === "PRI" ||
              getValueByHeaderKeys(["pk"]) === "1";

            setColumnInfo({
              name: targetColumnName,
              type:
                getValueByHeaderKeys(["type", "column_type", "data_type"]) ||
                activeTabNode.description ||
                "",
              nullable:
                getValueByHeaderKeys(["null", "is_nullable", "nullable"]) || "",
              defaultValue:
                getValueByHeaderKeys([
                  "default",
                  "column_default",
                  "dflt_value",
                ]) || "",
              isPrimaryKey: isPrimaryKey,
              extra:
                getValueByHeaderKeys(["extra", "column_comment", "comment"]) ||
                "",
              tableName:
                tableName ||
                activeTabNode.path[activeTabNode.path.length - 3]
                  ?.config_value ||
                "",
              rawInfo: info,
            });
          } else {
            // 没找到匹配行，用节点基本信息兜底
            setColumnInfo({
              name: targetColumnName,
              type: activeTabNode.description || "未知",
              nullable: "",
              defaultValue: "",
              isPrimaryKey: activeTabNode.iconName === "primary",
              extra: "",
              tableName:
                tableName ||
                activeTabNode.path[activeTabNode.path.length - 3]
                  ?.config_value ||
                "",
              rawInfo: null,
            });
          }
        } else {
          setError("无法获取列信息。");
        }
      } catch (err) {
        setError(`加载失败: ${getErrorMessage(err) || "未知错误"}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColumnDetails();
  }, [activeTabNode, tableName]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState label="正在读取列信息…" />;
    }

    if (error) {
      return (
        <ErrorState className="m-3" title="读取失败" description={error} />
      );
    }

    // 原来这里是 return null（白屏），改为明确的空态
    if (!columnInfo) {
      return (
        <EmptyState
          title="没有列信息"
          description="该列在当前连接上无法读取到详细属性。"
        />
      );
    }

    return (
      <div className="space-y-3 p-3">
        <KeyValueTable
          rows={[
            {
              label: "列名",
              value: (
                <span className="font-mono font-semibold">
                  {columnInfo.name}
                </span>
              ),
            },
            {
              label: "数据类型",
              value: <span className="font-mono">{columnInfo.type}</span>,
            },
            {
              label: "是否主键",
              value: columnInfo.isPrimaryKey ? (
                <StatusChip tone="success">是</StatusChip>
              ) : (
                <StatusChip>否</StatusChip>
              ),
            },
            { label: "可为空", value: columnInfo.nullable },
            {
              label: "默认值",
              value: (
                <span className="font-mono">
                  {String(columnInfo.defaultValue)}
                </span>
              ),
            },
            ...(columnInfo.extra
              ? [{ label: "额外信息", value: String(columnInfo.extra) }]
              : []),
            { label: "所属表", value: columnInfo.tableName },
          ]}
        />

        {/* 如果有原始信息，显示完整字段 */}
        {columnInfo.rawInfo ? (
          <div>
            <div className="mb-1 text-micro font-medium text-base-content/45">
              完整字段
            </div>
            <table className={TABLE_CLASS}>
              <thead>
                <tr>
                  <th className="w-[140px]">字段</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(columnInfo.rawInfo).map(([key, value]) => (
                  <tr key={key}>
                    <td className="font-mono text-base-content/60">{key}</td>
                    <td className="font-mono">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 flex-shrink-0 items-center border-b border-hairline px-3">
        <span className="text-[13px] font-semibold">列详情</span>
        {tableName ? (
          <StatusChip className="ml-2" title={tableName}>
            {tableName}
          </StatusChip>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default ColumnDetailPage;
