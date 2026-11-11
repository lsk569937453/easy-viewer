import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import type { ConnectionSummary } from "../types/backend";
import type { TreeNode } from "../types/tree";
import TableDetailPage from "./TableDetailPage";
import TableDataView from "./table-workspace/TableDataView";
import { useEditableRows } from "./table-workspace/useEditableRows";
import { useTableData } from "./table-workspace/useTableData";
import ConfirmDialog from "./ui/ConfirmDialog";
import SegmentedTabs from "./ui/SegmentedTabs";
import { EmptyState } from "./ui/states";

const SUB_TABS = [
  { id: "properties", label: "结构" },
  { id: "data", label: "数据" },
  { id: "diagram", label: "关系图" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

interface TableWorkspacePanelProps {
  initialSql?: string;
  activeTabNode: TreeNode;
  connectionDetails: ConnectionSummary;
}

/**
 * 表工作区：结构 / 数据 / 关系图三个子视图。
 * 数据视图的状态与视图已拆到 `table-workspace/`，本文件只保留子视图编排。
 */
function TableWorkspacePanel({
  initialSql,
  activeTabNode,
  connectionDetails,
}: TableWorkspacePanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("data");
  const [sqlQuery, setSqlQuery] = useState(initialSql || "");

  const rows = useEditableRows({
    tableName: activeTabNode.name,
    tablePath: activeTabNode.path,
    baseConfigId: connectionDetails.base_config_id,
  });
  const data = useTableData({
    tableData: rows.tableData,
    activeTabNode,
    onRowsLoaded: rows.setLoadedRows,
    onRowsCleared: rows.clearRows,
  });

  useEffect(() => {
    setSqlQuery(initialSql || "");
    if (activeTabNode && activeSubTab === "data") {
      void data.fetchTableData(initialSql);
    } else {
      data.clearTableData(); // 清除数据时重置分页
    }
  }, [initialSql, activeTabNode, activeSubTab]);

  const handleSqlQueryChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSqlQuery(e.target.value);
  };

  const handleExecuteSql = () => {
    void data.fetchTableData(sqlQuery);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 子视图：结构 / 数据 / 关系图（原来混用英文 Properties/Data/Diagram） */}
      <SegmentedTabs
        items={SUB_TABS}
        activeId={activeSubTab}
        onChange={setActiveSubTab}
        className="bg-base-200/40"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeSubTab === "properties" && (
          // 将原来的内容替换为 TableDetailPage 组件
          <TableDetailPage activeTabNode={activeTabNode} />
        )}

        {activeSubTab === "data" && (
          <TableDataView
            data={data}
            rows={rows}
            sqlQuery={sqlQuery}
            onSqlQueryChange={handleSqlQueryChange}
            onExecute={handleExecuteSql}
          />
        )}

        {activeSubTab === "diagram" && (
          <EmptyState
            title="关系图尚未实现"
            description="当前版本提供「结构」与「数据」两个视图，关系图功能仍在开发中。"
          />
        )}
      </div>

      <ConfirmDialog
        open={rows.rowPendingDelete !== null}
        title="删除这一行数据？"
        description={`将删除 ${
          rows.rowPendingDelete && rows.columnHeaders[0]
            ? String(rows.rowPendingDelete[rows.columnHeaders[0]] ?? "")
            : "该行"
        }，操作不可撤销。`}
        confirmText="删除"
        busy={rows.deleting}
        onConfirm={() =>
          void rows.confirmDeleteRow(() => data.fetchTableData(sqlQuery))
        }
        onCancel={rows.cancelDeleteRow}
      />
    </div>
  );
}

export default TableWorkspacePanel;
