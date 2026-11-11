import { TABLE_CLASS } from "../ui/DataTableShell";
import Panel from "../ui/Panel";

/** 展示用的静态配置行（后端暂未返回真实 Topic 配置）。 */
const STATIC_CONFIG_ROWS = [
  { key: "default.replication.factor", value: "1", note: "默认副本因子" },
  { key: "retention.ms", value: "604800000 (7 days)", note: "消息保留时间" },
  { key: "retention.bytes", value: "-1 (unlimited)", note: "消息保留大小" },
  { key: "cleanup.policy", value: "delete", note: "清理策略" },
];

export interface TopicConfigTabProps {
  partitionCount: number;
}

/** 配置页签：分区数 + 静态配置表。 */
function TopicConfigTab({ partitionCount }: TopicConfigTabProps) {
  return (
    <Panel className="p-0">
      <h3 className="px-3 pt-3 text-[13px] font-semibold">Topic 配置</h3>
      <table className={`${TABLE_CLASS} mt-2`}>
        <thead>
          <tr>
            <th>配置项</th>
            <th>值</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-mono">num.partitions</td>
            <td>{partitionCount}</td>
            <td>分区数量</td>
          </tr>
          {STATIC_CONFIG_ROWS.map((row) => (
            <tr key={row.key}>
              <td className="font-mono">{row.key}</td>
              <td>{row.value}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export default TopicConfigTab;
