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
import type { ExeSqlResponse } from "../types/backend";
import type { TreeNode } from "../types/tree";
import { parseBaseResponse } from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";
import useIsDarkTheme from "../utils/useIsDarkTheme";
import DataTableShell, { TABLE_CLASS } from "./ui/DataTableShell";
import KeyValueTable from "./ui/KeyValueTable";
import { EmptyState, ErrorState, LoadingState } from "./ui/states";

const INDEX_TABS = [
  { id: "info", label: "基本信息" },
  { id: "columns", label: "索引列" },
  { id: "sql", label: "创建 SQL" },
] as const;

interface IndexInfo {
  name: string;
  type: string;
  nonUnique: boolean;
  tableName: string;
}

interface IndexColumn {
  columnName: string;
  seqInIndex: string | number;
  collation: string;
  cardinality: string | number;
  subPart: string | null;
  nullable: string;
}

interface IndexDetailPageProps {
  activeTabNode?: TreeNode | null;
  tableName?: string;
}

function IndexDetailPage({ activeTabNode, tableName }: IndexDetailPageProps) {
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null);
  const [indexColumns, setIndexColumns] = useState<IndexColumn[]>([]);
  const [createIndexSql, setCreateIndexSql] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("columns");
  const isDarkTheme = useIsDarkTheme();

  useEffect(() => {
    const fetchIndexDetails = async () => {
      if (!activeTabNode?.path || !tableName) {
        setError("无法加载索引详情：缺少必要信息。");
        console.error("IndexDetailPage: Missing required data", {
          activeTabNode,
          tableName,
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 获取索引列信息
        const indexColumnsSql = `
          SELECT
            COLUMN_NAME as column_name,
            SEQ_IN_INDEX as seq_in_index,
            COLLATION as collation,
            CARDINALITY as cardinality,
            SUB_PART as sub_part,
            NULLABLE as nullable
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${activeTabNode.name}'
          ORDER BY SEQ_IN_INDEX
        `;

        const listNodeInfoReq = { level_infos: activeTabNode.path };
        const responseJson = await invoke<string>("exe_sql", {
          sql: indexColumnsSql,
          listNodeInfoReq: listNodeInfoReq,
        });
        const { response_code, response_msg } =
          parseBaseResponse<ExeSqlResponse>(responseJson);

        if (response_code === 0 && response_msg.rows) {
          const columns: IndexColumn[] = response_msg.rows.map((row) => ({
            columnName: row[0] || "",
            seqInIndex: row[1] || 0,
            collation: row[2] || "",
            cardinality: row[3] || 0,
            subPart: row[4] || null,
            nullable: row[5] || "YES",
          }));
          setIndexColumns(columns);
        } else {
          console.error("IndexDetailPage: Failed to get index columns", {
            response_code,
            response_msg,
          });
        }

        // 获取创建索引的 SQL
        const createIndexSqlQuery = `
          SELECT
            CONCAT(
              'CREATE ',
              IF(NON_UNIQUE = 1, '', 'UNIQUE '),
              'INDEX \`', INDEX_NAME, '\`',
              ' ON \`', TABLE_NAME, '\`',
              ' (', GROUP_CONCAT(\`COLUMN_NAME\` ORDER BY SEQ_IN_INDEX SEPARATOR ', '), ')',
              IF(INDEX_TYPE = 'FULLTEXT', CONCAT(' FULLTEXT'), ''),
              IF(INDEX_TYPE = 'HASH', CONCAT(' USING HASH'), ''),
              IF(INDEX_TYPE = 'BTREE', CONCAT(' USING BTREE'), '')
            ) as create_sql
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${activeTabNode.name}'
          GROUP BY INDEX_NAME, INDEX_TYPE, NON_UNIQUE, TABLE_NAME
        `;

        const createSqlResponseJson = await invoke<string>("exe_sql", {
          sql: createIndexSqlQuery,
          listNodeInfoReq: listNodeInfoReq,
        });
        const createSqlResponse = parseBaseResponse<ExeSqlResponse>(
          createSqlResponseJson,
        );

        if (createSqlResponse.response_code === 0) {
          const firstRow = createSqlResponse.response_msg.rows[0];
          if (firstRow) {
            setCreateIndexSql(firstRow[0] || "-- 无法生成创建索引的 SQL");
          } else {
            console.error("IndexDetailPage: Failed to get create SQL", {
              createMsg: createSqlResponse.response_msg,
            });
          }
        } else {
          console.error("IndexDetailPage: Failed to get create SQL", {
            createMsg: createSqlResponse.response_msg,
          });
        }

        // 获取索引基本信息
        const indexInfoSql = `
          SELECT DISTINCT
            INDEX_NAME as index_name,
            INDEX_TYPE as index_type,
            NON_UNIQUE as non_unique,
            TABLE_NAME as table_name
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${activeTabNode.name}'
          LIMIT 1
        `;

        const infoResponseJson = await invoke<string>("exe_sql", {
          sql: indexInfoSql,
          listNodeInfoReq: listNodeInfoReq,
        });
        const infoResponse =
          parseBaseResponse<ExeSqlResponse>(infoResponseJson);

        if (infoResponse.response_code === 0) {
          const infoRow = infoResponse.response_msg.rows[0];
          if (infoRow) {
            setIndexInfo({
              name: infoRow[0] || activeTabNode.name,
              type: infoRow[1] || "",
              // 后端行值统一为字符串；原实现 `=== 1` 与字符串比较恒为 false，保持既有行为
              nonUnique: false,
              tableName: infoRow[3] || tableName,
            });
          } else {
            console.error("IndexDetailPage: Failed to get index info", {
              infoMsg: infoResponse.response_msg,
            });
          }
        } else {
          console.error("IndexDetailPage: Failed to get index info", {
            infoMsg: infoResponse.response_msg,
          });
        }
      } catch (err) {
        console.error("获取索引详情失败:", err);
        setError(`加载失败: ${getErrorMessage(err) || "未知错误"}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndexDetails();
  }, [activeTabNode, tableName]);

  const columns = useMemo<ColumnDef<IndexColumn>[]>(
    () => [
      { accessorKey: "columnName", header: "列名" },
      { accessorKey: "seqInIndex", header: "序号" },
      { accessorKey: "collation", header: "排序" },
      { accessorKey: "cardinality", header: "基数" },
      { accessorKey: "subPart", header: "前缀长度" },
      { accessorKey: "nullable", header: "可为空" },
    ],
    [],
  );

  const table = useReactTable({
    data: indexColumns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
      return (
        <DataTableShell
          isEmpty={indexColumns.length === 0}
          placeholder={
            <EmptyState
              compact
              title="没有索引列"
              description="该索引没有返回列定义。"
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
                    <td
                      key={cell.id}
                      className="max-w-[240px] truncate"
                      title={String(cell.getValue() || "")}
                    >
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

    if (activeTab === "sql") {
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
          {createIndexSql || "-- 无法生成创建索引的 SQL"}
        </SyntaxHighlighter>
      );
    }

    if (activeTab === "info") {
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
              { label: "列数量", value: indexColumns.length },
            ]}
          />
        </div>
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
        {INDEX_TABS.map((indexTab) => (
          <button
            key={indexTab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === indexTab.id}
            className={`-mb-px border-b-2 px-3 text-xs transition-colors ${
              activeTab === indexTab.id
                ? "border-primary font-medium text-base-content"
                : "border-transparent text-base-content/55 hover:text-base-content/85"
            }`}
            onClick={() => setActiveTab(indexTab.id)}
          >
            {indexTab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default IndexDetailPage;
