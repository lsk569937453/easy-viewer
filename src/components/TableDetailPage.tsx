import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ShowColumnsResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import useIsDarkTheme from "../utils/useIsDarkTheme";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import { EmptyState, ErrorState } from "./ui/states";

interface ColumnData {
  name: string;
  type: string;
  isNullable: string;
  isPrimaryKey: string;
  defaultValue: string;
}

interface TableDetailPageProps {
  activeTabNode?: TreeNode | null;
  connectionDetails?: unknown;
  defaultTab?: string;
}

const DETAIL_TABS = [
  { id: "ddl", label: "DDL" },
  { id: "column", label: "列信息" },
] as const;

const ColumnSkeleton = () => (
  <table className={TABLE_CLASS}>
    <thead>
      <tr>
        <th>列名</th>
        <th>数据类型</th>
        <th>可为空</th>
        <th>主键</th>
        <th>默认值</th>
      </tr>
    </thead>
    <tbody>
      {[0, 1, 2, 3, 4].map((rowIndex) => (
        <tr key={rowIndex}>
          {[0, 1, 2, 3, 4].map((cellIndex) => (
            <td key={cellIndex}>
              <div className="skeleton h-3 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const DdlSkeleton = () => (
  <div className="space-y-2 p-3">
    <div className="skeleton h-3 w-full" />
    <div className="skeleton h-3 w-11/12" />
    <div className="skeleton h-3 w-full" />
    <div className="skeleton h-3 w-10/12" />
    <div className="skeleton h-3 w-full" />
  </div>
);

function TableDetailPage({ activeTabNode, defaultTab }: TableDetailPageProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || "ddl");
  const [columnsData, setColumnsData] = useState<ColumnData[]>([]);
  const [ddl, setDdl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDarkTheme = useIsDarkTheme();

  useEffect(() => {
    const fetchData = async () => {
      if (!activeTabNode?.path) {
        setDdl("");
        setColumnsData([]);
        setError("无法加载数据：节点信息不完整。");
        return;
      }

      setIsLoading(true);
      setError(null);

      const listNodeInfoReq = { level_infos: activeTabNode.path };

      try {
        const [ddlResponseJson, columnsResponseJson] = await Promise.all([
          invoke<string>("get_ddl", { listNodeInfoReq }),
          invoke<string>("show_columns", { listNodeInfoReq }),
        ]);

        // 1. 解析DDL响应
        const ddlResponse = parseBaseResponse<string>(ddlResponseJson);
        if (ddlResponse.response_code === 0) {
          setDdl(ddlResponse.response_msg); // 从 response_msg 中获取DDL字符串
        } else {
          throw new Error(`获取 DDL 失败: ${ddlResponse.response_msg}`);
        }
        // 2. 解析列信息响应
        const columnsResponse =
          parseBaseResponse<ShowColumnsResponse>(columnsResponseJson);
        if (columnsResponse.response_code === 0) {
          const columnsPayload = columnsResponse.response_msg; // 从 response_msg 中获取数据体

          if (columnsPayload.rows) {
            // 3. 根据日志修正列数据映射的索引
            const formattedColumns = columnsPayload.rows.map((row) => ({
              // row[0] is cid, row[1] is name, row[2] is type, etc.
              name: row[1] ?? "",
              type: row[2] ?? "",
              isNullable: row[3] === "1" ? "YES" : "NO", // notnull: 0 -> YES, 1 -> NO
              isPrimaryKey: row[5] === "1" ? "YES" : "NO", // pk: 1 -> YES, 0 -> NO
              defaultValue: row[4] != null ? String(row[4]) : "NULL",
            }));
            setColumnsData(formattedColumns);
          } else {
            throw new Error("列数据的格式不正确。");
          }
        } else {
          throw new Error(`获取列信息失败: ${columnsResponse.response_msg}`);
        }
      } catch (err) {
        console.error("获取表详情失败:", err);
        setError(`加载失败: ${getErrorMessage(err) || "未知错误"}`);
        setDdl("");
        setColumnsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTabNode]);

  const columns = useMemo<ColumnDef<ColumnData>[]>(
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

  const renderContent = () => {
    if (isLoading) {
      return activeTab === "ddl" ? <DdlSkeleton /> : <ColumnSkeleton />;
    }

    if (error) {
      return (
        <ErrorState className="m-3" title="读取失败" description={error} />
      );
    }

    if (activeTab === "ddl") {
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
    }

    if (activeTab === "column") {
      return (
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        className="flex h-9 flex-shrink-0 items-stretch border-b border-hairline px-1"
      >
        {DETAIL_TABS.map((detailTab) => (
          <button
            key={detailTab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === detailTab.id}
            className={`-mb-px border-b-2 px-3 text-xs transition-colors ${
              activeTab === detailTab.id
                ? "border-primary font-medium text-base-content"
                : "border-transparent text-base-content/55 hover:text-base-content/85"
            }`}
            onClick={() => setActiveTab(detailTab.id)}
          >
            {detailTab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default TableDetailPage;
