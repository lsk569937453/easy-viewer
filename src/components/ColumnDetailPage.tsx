import type { TreeNode } from "../types/tree";
import { useColumnDetail } from "./column-detail/useColumnDetail";
import { TABLE_CLASS } from "./ui/DataTableShell";
import KeyValueTable from "./ui/KeyValueTable";
import StatusChip from "./ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";

interface ColumnDetailPageProps {
  activeTabNode?: TreeNode | null;
  tableName?: string;
}

function ColumnDetailPage({ activeTabNode, tableName }: ColumnDetailPageProps) {
  const { columnInfo, isLoading, error } = useColumnDetail(
    activeTabNode,
    tableName,
  );

  const renderRawInfoTable = () => {
    if (!columnInfo?.rawInfo) return null;

    return (
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
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState label="正在读取列信息…" />;
    }

    if (error) {
      return (
        <ErrorState className="m-3" title="读取失败" description={error} />
      );
    }

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

        {renderRawInfoTable()}
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
