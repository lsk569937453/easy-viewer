import DataTableShell, { TABLE_CLASS } from "../ui/DataTableShell";
import KeyValueTable from "../ui/KeyValueTable";
import Panel from "../ui/Panel";
import StatusChip from "../ui/StatusChip";
import { EmptyState } from "../ui/states";
import type { TopicPartition } from "./useKafkaTopic";

export interface TopicOverviewTabProps {
  topicName: string;
  partitions: TopicPartition[];
}

/** 概览页签：基本信息 + 分区表。 */
function TopicOverviewTab({ topicName, partitions }: TopicOverviewTabProps) {
  return (
    <div className="space-y-3">
      <Panel className="p-3">
        <h3 className="mb-2 text-[13px] font-semibold">基本信息</h3>
        <KeyValueTable
          rows={[
            {
              label: "Topic 名称",
              value: <span className="font-mono">{topicName}</span>,
            },
            { label: "分区数", value: partitions.length },
          ]}
        />
      </Panel>

      <Panel className="p-0">
        <h3 className="px-3 pt-3 text-[13px] font-semibold">分区列表</h3>
        <DataTableShell
          className="mt-2"
          isEmpty={partitions.length === 0}
          placeholder={
            <EmptyState
              compact
              title="暂无分区"
              description="该 Topic 没有返回分区信息。"
            />
          }
        >
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th>分区 ID</th>
                <th>Leader</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {partitions.map((partition) => (
                <tr key={partition.id}>
                  <td className="font-mono">Partition {partition.id}</td>
                  <td>{partition.leader}</td>
                  <td>
                    <StatusChip tone="success" dot>
                      在线
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </Panel>
    </div>
  );
}

export default TopicOverviewTab;
