import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import type { TreeNode } from "../types/tree";
import type { TableColumnRow } from "../utils/columnInfo";
import useIsDarkTheme from "../utils/useIsDarkTheme";
import { useTableDetail } from "./table-detail/useTableDetail";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import SegmentedTabs, { type SegmentedTabItem } from "./ui/SegmentedTabs";
import { ParagraphSkeleton, TableSkeleton } from "./ui/Skeleton";
import { EmptyState, ErrorState } from "./ui/states";

interface TableDetailPageProps {
  activeTabNode?: TreeNode | null;
  connectionDetails?: unknown;
  defaultTab?: string;
}

const DETAIL_TABS: readonly SegmentedTabItem[] = [
  { id: "ddl", label: "DDL" },
  { id: "column", label: "列信息" },
];

const COLUMN_HEADERS = [
  "列名",
  "数据类型",
  "可为空",
  "主键",
  "默认值",
] as const;

function TableDetailPage({ activeTabNode, defaultTab }: TableDetailPageProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || "ddl");
  const {
    ddl,
    columns: columnsData,
    isLoading,
    error,
  } = useTableDetail(activeTabNode);
  const isDarkTheme = useIsDarkTheme();

  const columns = useMemo<ColumnDef<TableColumnRow>[]>(
    () => [
      { accessorKey: "name", header: "列名" },
      { accessorKey: "type", header: "数据类型" },
      { accessorKey: "isNullable", header: "可为空" },
      { accessorKey: "isPrimaryKey", header: "主键" },
      { accessorKey: "defaultValue", header: "默认值" },
    ],
    [],
  );

  const table = useReactTable({
    data: columnsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderDdlContent = () => {
    if (!ddl) {
      return (
        <EmptyState
          compact
          title="没有 DDL"
          description="该对象没有可展示的建表语句。"
        />
      );
    }
    return (
      <SyntaxHighlighter
        language="sql"
        style={isDarkTheme ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          minHeight: "100%",
          fontSize: 12,
          background: "transparent",
        }}
      >
        {ddl}
      </SyntaxHighlighter>
    );
  };

  const renderColumnsContent = () => (
    <DataTableShell
      isEmpty={columnsData.length === 0}
      placeholder={
        <EmptyState
          compact
          title="没有列信息"
          description="当前对象没有返回列定义。"
        />
      }
    >
      <table className={TABLE_CLASS}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );

  const renderContent = () => {
    if (isLoading) {
      return activeTab === "ddl" ? (
        <ParagraphSkeleton />
      ) : (
        <TableSkeleton headers={COLUMN_HEADERS} />
      );
    }

    if (error) {
      return (
        <ErrorState className="m-3" title="读取失败" description={error} />
      );
    }

    if (activeTab === "ddl") return renderDdlContent();
    if (activeTab === "column") return renderColumnsContent();
    return null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs
        items={DETAIL_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="表详情视图"
      />

      <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default TableDetailPage;
