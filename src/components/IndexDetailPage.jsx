import React, { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

function IndexDetailPage({ activeTabNode, tableName }) {
  const [indexInfo, setIndexInfo] = useState(null);
  const [indexColumns, setIndexColumns] = useState([]);
  const [createIndexSql, setCreateIndexSql] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("columns");

  useEffect(() => {
    const fetchIndexDetails = async () => {
      console.log("IndexDetailPage: fetchIndexDetails called", { activeTabNode, tableName });

      if (!activeTabNode || !activeTabNode.path || !tableName) {
        setError("无法加载索引详情：缺少必要信息。");
        console.error("IndexDetailPage: Missing required data", { activeTabNode, tableName });
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

        console.log("IndexDetailPage: Executing SQL", indexColumnsSql);

        const listNodeInfoReq = { level_infos: activeTabNode.path };
        const responseJson = await invoke("exe_sql", {
          sql: indexColumnsSql,
          listNodeInfoReq: listNodeInfoReq,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        console.log("IndexDetailPage: SQL response", { response_code, response_msg });

        if (response_code === 0 && response_msg && response_msg.rows) {
          const columns = response_msg.rows.map((row) => ({
            columnName: row[0] || "",
            seqInIndex: row[1] || 0,
            collation: row[2] || "",
            cardinality: row[3] || 0,
            subPart: row[4] || null,
            nullable: row[5] || "YES",
          }));
          console.log("IndexDetailPage: Parsed columns", columns);
          setIndexColumns(columns);
        } else {
          console.error("IndexDetailPage: Failed to get index columns", { response_code, response_msg });
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

        console.log("IndexDetailPage: Executing create SQL query", createIndexSqlQuery);

        const createSqlResponseJson = await invoke("exe_sql", {
          sql: createIndexSqlQuery,
          listNodeInfoReq: listNodeInfoReq,
        });
        const { response_code: createCode, response_msg: createMsg } =
          JSON.parse(createSqlResponseJson);

        console.log("IndexDetailPage: Create SQL response", { createCode, createMsg });

        if (createCode === 0 && createMsg && createMsg.rows && createMsg.rows[0]) {
          setCreateIndexSql(createMsg.rows[0][0] || "-- 无法生成创建索引的 SQL");
        } else {
          console.error("IndexDetailPage: Failed to get create SQL", { createCode, createMsg });
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

        console.log("IndexDetailPage: Executing index info query", indexInfoSql);

        const infoResponseJson = await invoke("exe_sql", {
          sql: indexInfoSql,
          listNodeInfoReq: listNodeInfoReq,
        });
        const { response_code: infoCode, response_msg: infoMsg } =
          JSON.parse(infoResponseJson);

        console.log("IndexDetailPage: Index info response", { infoCode, infoMsg });

        if (infoCode === 0 && infoMsg && infoMsg.rows && infoMsg.rows[0]) {
          setIndexInfo({
            name: infoMsg.rows[0][0] || activeTabNode.name,
            type: infoMsg.rows[0][1] || "",
            nonUnique: infoMsg.rows[0][2] === 1,
            tableName: infoMsg.rows[0][3] || tableName,
          });
        } else {
          console.error("IndexDetailPage: Failed to get index info", { infoCode, infoMsg });
        }
      } catch (err) {
        console.error("获取索引详情失败:", err);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndexDetails();
  }, [activeTabNode, tableName]);

  const columns = useMemo(
    () => [
      { accessorKey: "columnName", header: "列名" },
      { accessorKey: "seqInIndex", header: "序号" },
      { accessorKey: "collation", header: "排序" },
      { accessorKey: "cardinality", header: "基数" },
      { accessorKey: "subPart", header: "前缀长度" },
      { accessorKey: "nullable", header: "可为空" },
    ],
    []
  );

  const table = useReactTable({
    data: indexColumns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      );
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

    if (activeTab === "columns") {
      return (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full" style={{ fontSize: "12px" }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: "120px", fontSize: "12px" }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} style={{ fontSize: "12px" }}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: "120px" }}
                      className="truncate"
                      title={String(cell.getValue() || "")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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

    if (activeTab === "sql") {
      return (
        <SyntaxHighlighter
          language="sql"
          style={vscDarkPlus}
          customStyle={{ margin: 0, height: "100%", fontSize: "12px" }}
        >
          {createIndexSql || "-- 无法生成创建索引的 SQL"}
        </SyntaxHighlighter>
      );
    }

    if (activeTab === "info") {
      return (
        <div className="space-y-4" style={{ fontSize: "12px" }}>
          {indexInfo && (
            <table className="table table-zebra w-full">
              <tbody>
                <tr>
                  <th className="w-[120px]">索引名称</th>
                  <td>{indexInfo.name}</td>
                </tr>
                <tr>
                  <th>索引类型</th>
                  <td>{indexInfo.type}</td>
                </tr>
                <tr>
                  <th>是否唯一</th>
                  <td>{indexInfo.nonUnique ? "否" : "是"}</td>
                </tr>
                <tr>
                  <th>所属表</th>
                  <td>{indexInfo.tableName}</td>
                </tr>
                <tr>
                  <th>列数量</th>
                  <td>{indexColumns.length}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="tabs tabs-boxed mb-4 self-start">
        <a
          className={`tab ${activeTab === "info" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          基本信息
        </a>
        <a
          className={`tab ${activeTab === "columns" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("columns")}
        >
          索引列
        </a>
        <a
          className={`tab ${activeTab === "sql" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("sql")}
        >
          创建SQL
        </a>
      </div>

      <div className="flex-grow overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default IndexDetailPage;
