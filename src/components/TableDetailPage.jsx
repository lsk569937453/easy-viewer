import React, { useState, useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

// TODO: Replace this with actual data fetched from your backend
const MOCK_DDL = `CREATE TABLE "employees" (
  "employee_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT UNIQUE,
  "phone_number" TEXT,
  "hire_date" TEXT NOT NULL,
  "job_id" INTEGER NOT NULL,
  "salary" REAL NOT NULL,
  "manager_id" INTEGER,
  FOREIGN KEY ("job_id") REFERENCES "jobs" ("job_id"),
  FOREIGN KEY ("manager_id") REFERENCES "employees" ("employee_id")
);`;

// TODO: Replace this with actual data fetched from your backend
const MOCK_COLUMNS_DATA = [
  { name: "employee_id", type: "INTEGER", isNullable: "NO", isPrimaryKey: "YES", defaultValue: null },
  { name: "first_name", type: "TEXT", isNullable: "NO", isPrimaryKey: "NO", defaultValue: null },
  { name: "last_name", type: "TEXT", isNullable: "NO", isPrimaryKey: "NO", defaultValue: null },
  { name: "email", type: "TEXT", isNullable: "YES", isPrimaryKey: "NO", defaultValue: "N/A" },
  { name: "phone_number", type: "TEXT", isNullable: "YES", isPrimaryKey: "NO", defaultValue: null },
  { name: "hire_date", type: "TEXT", isNullable: "NO", isPrimaryKey: "NO", defaultValue: "CURRENT_TIMESTAMP" },
  { name: "job_id", type: "INTEGER", isNullable: "NO", isPrimaryKey: "NO", defaultValue: null },
  { name: "salary", type: "REAL", isNullable: "NO", isPrimaryKey: "NO", defaultValue: "0.0" },
  { name: "manager_id", type: "INTEGER", isNullable: "YES", isPrimaryKey: "NO", defaultValue: null },
];


function TableDetailPage({ activeTabNode, connectionDetails }) {
  const [activeTab, setActiveTab] = useState("ddl");
  const [columnsData] = useState(MOCK_COLUMNS_DATA);
  const [ddl] = useState(MOCK_DDL);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Column Name",
      },
      {
        accessorKey: "type",
        header: "Data Type",
      },
      {
        accessorKey: "isNullable",
        header: "Nullable",
      },
      {
        accessorKey: "isPrimaryKey",
        header: "Primary Key",
      },
      {
        accessorKey: "defaultValue",
        header: "Default",
      },
    ],
    []
  );

  const table = useReactTable({
    data: columnsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="tabs tabs-boxed mb-4 self-start">
        <a
          className={`tab ${activeTab === "ddl" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("ddl")}
        >
          DDL
        </a>
        <a
          className={`tab ${activeTab === "column" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("column")}
        >
          Columns
        </a>
      </div>

      <div className="flex-grow overflow-auto">
        {activeTab === "ddl" && (
          <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, height: "100%" }}>
            {ddl}
          </SyntaxHighlighter>
        )}
        {activeTab === "column" && (
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
                              header.getContext()
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
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default TableDetailPage;