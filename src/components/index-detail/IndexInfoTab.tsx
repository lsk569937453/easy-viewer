import type { IndexInfo } from "../../utils/indexSql";
import KeyValueTable from "../ui/KeyValueTable";
import { EmptyState } from "../ui/states";

export interface IndexInfoTabProps {
  indexInfo: IndexInfo | null;
  columnCount: number;
}

/** 基本信息页签：索引属性 KV 展示。 */
function IndexInfoTab({ indexInfo, columnCount }: IndexInfoTabProps) {
  if (!indexInfo) {
    return (
      <EmptyState
        title="没有索引信息"
        description="该索引在当前连接上无法读取到详细属性。"
      />
    );
  }

  return (
    <div className="p-3">
      <KeyValueTable
        rows={[
          { label: "索引名称", value: indexInfo.name },
          { label: "索引类型", value: indexInfo.type },
          { label: "是否唯一", value: indexInfo.nonUnique ? "否" : "是" },
          { label: "所属表", value: indexInfo.tableName },
          { label: "列数量", value: columnCount },
        ]}
      />
    </div>
  );
}

export default IndexInfoTab;
