import { useState } from "react";
import type { TreeNode } from "../types/tree";
import IndexColumnsTab from "./index-detail/IndexColumnsTab";
import IndexInfoTab from "./index-detail/IndexInfoTab";
import IndexSqlTab from "./index-detail/IndexSqlTab";
import { useIndexDetail } from "./index-detail/useIndexDetail";
import SegmentedTabs, { type SegmentedTabItem } from "./ui/SegmentedTabs";
import { ErrorState, LoadingState } from "./ui/states";

const INDEX_TABS: readonly SegmentedTabItem[] = [
  { id: "info", label: "基本信息" },
  { id: "columns", label: "索引列" },
  { id: "sql", label: "创建 SQL" },
];

interface IndexDetailPageProps {
  activeTabNode?: TreeNode | null;
  tableName?: string;
}

function IndexDetailPage({ activeTabNode, tableName }: IndexDetailPageProps) {
  const [activeTab, setActiveTab] = useState("columns");
  const { indexInfo, indexColumns, createIndexSql, isLoading, error } =
    useIndexDetail(activeTabNode, tableName);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState label="正在读取索引信息…" />;
    }

    if (error) {
      return (
        <ErrorState className="m-3" title="读取失败" description={error} />
      );
    }

    if (activeTab === "columns") {
      return <IndexColumnsTab indexColumns={indexColumns} />;
    }

    if (activeTab === "sql") {
      return <IndexSqlTab createIndexSql={createIndexSql} />;
    }

    if (activeTab === "info") {
      return (
        <IndexInfoTab indexInfo={indexInfo} columnCount={indexColumns.length} />
      );
    }

    return null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs
        items={INDEX_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="索引详情视图"
      />

      <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default IndexDetailPage;
