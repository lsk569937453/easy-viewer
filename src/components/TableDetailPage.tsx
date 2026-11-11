import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ShowColumnsResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";

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

const ColumnSkeleton = () => (
  <div className="overflow-x-auto">
    <table className="table table-zebra w-full">
      <thead>
        <tr>
          <th>
            <div className="skeleton h-4 w-32"></div>
          </th>
          <th>
            <div className="skeleton h-4 w-24"></div>
          </th>
          <th>
            <div className="skeleton h-4 w-20"></div>
          </th>
          <th>
            <div className="skeleton h-4 w-24"></div>
          </th>
          <th>
            <div className="skeleton h-4 w-28"></div>
          </th>
        </tr>
      </thead>
      <tbody>
        {[...Array(5)].map((_, i) => (
          <tr key={i}>
            <td>
              <div className="skeleton h-4 w-full"></div>
            </td>
            <td>
              <div className="skeleton h-4 w-full"></div>
            </td>
            <td>
              <div className="skeleton h-4 w-full"></div>
            </td>
            <td>
              <div className="skeleton h-4 w-full"></div>
            </td>
            <td>
              <div className="skeleton h-4 w-full"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// DDL 组件，用于在代码加载时显示骨架屏效果
const DdlSkeleton = () => (
  <div className="space-y-2">
    <div className="skeleton h-4 w-full"></div>
    <div className="skeleton h-4 w-11/12"></div>
    <div className="skeleton h-4 w-full"></div>
    <div className="skeleton h-4 w-10/12"></div>
    <div className="skeleton h-4 w-full"></div>
  </div>
);

function TableDetailPage({ activeTabNode, defaultTab }: TableDetailPageProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || "ddl");
  const [columnsData, setColumnsData] = useState<ColumnData[]>([]);
  const [ddl, setDdl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div role="alert" className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      );
    }

    if (activeTab === "ddl") {
      return (
        <SyntaxHighlighter
          language="sql"
          style={vscDarkPlus}
          customStyle={{ margin: 0, height: "100%" }}
        >
          {ddl}
        </SyntaxHighlighter>
      );
    }

    if (activeTab === "column") {
      return (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
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
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div role="tablist" className="tabs tabs-boxed mb-4 self-start">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ddl"}
          className={`tab ${activeTab === "ddl" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("ddl")}
        >
          DDL
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "column"}
          className={`tab ${activeTab === "column" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("column")}
        >
          列信息
        </button>
      </div>

      <div className="flex-grow overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default TableDetailPage;
