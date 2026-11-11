import KeyValueTable from "../ui/KeyValueTable";
import Panel from "../ui/Panel";
import StatusChip from "../ui/StatusChip";
import { EmptyState } from "../ui/states";
import type { TopicPartition } from "./useKafkaTopic";

export interface TopicPartitionsTabProps {
  partitions: TopicPartition[];
}

/** 分区页签：按卡片栅格展示每个分区的 Leader / 副本 / ISR。 */
function TopicPartitionsTab({ partitions }: TopicPartitionsTabProps) {
  if (partitions.length === 0) {
    return (
      <EmptyState
        title="暂无分区信息"
        description="该 Topic 没有返回任何分区。"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {partitions.map((partition) => (
        <Panel key={partition.id} className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">
              Partition {partition.id}
            </span>
            <StatusChip tone="success" dot>
              在线
            </StatusChip>
          </div>
          <KeyValueTable
            labelWidth="4.5rem"
            rows={[
              {
                label: "Leader",
                value: <span className="font-mono">{partition.leader}</span>,
              },
              { label: "副本", value: "1" },
              { label: "ISR", value: "1" },
            ]}
          />
        </Panel>
      ))}
    </div>
  );
}

export default TopicPartitionsTab;
