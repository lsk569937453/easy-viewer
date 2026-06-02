import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function ColumnDetailPage({ activeTabNode, tableName }) {
  const [columnInfo, setColumnInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchColumnDetails = async () => {
      if (!activeTabNode || !activeTabNode.path) {
        setError("无法加载列详情：缺少必要信息。");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const listNodeInfoReq = { level_infos: activeTabNode.path };
        const responseJson = await invoke("show_columns", {
          listNodeInfoReq,
        });
        const { response_code, response_msg } = JSON.parse(responseJson);

        if (response_code === 0 && response_msg && response_msg.rows) {
          const headers = (response_msg.header || []).map((h) => h.name);
          const targetColumnName = activeTabNode.name;

          // 从所有行中找到匹配的列
          const matchedRow = response_msg.rows.find((row) => {
            const nameIdx = headers.findIndex(
              (h) =>
                h.toLowerCase() === "field" ||
                h.toLowerCase() === "name" ||
                h.toLowerCase() === "column_name"
            );
            return nameIdx >= 0 && row[nameIdx] === targetColumnName;
          });

          if (matchedRow) {
            // 动态构建列信息对象
            const info = {};
            headers.forEach((header, idx) => {
              info[header] = matchedRow[idx] !== null ? matchedRow[idx] : "NULL";
            });

            // 提取通用字段（不同数据库 header 名不同）
            const getValueByHeaderKeys = (keys) => {
              for (const key of keys) {
                const found = Object.keys(info).find(
                  (h) => h.toLowerCase() === key.toLowerCase()
                );
                if (found) return info[found];
              }
              return null;
            };

            const isPrimaryKey =
              activeTabNode.iconName === "primary" ||
              getValueByHeaderKeys(["key"]) === "PRI" ||
              getValueByHeaderKeys(["pk"]) === "1";

            setColumnInfo({
              name: targetColumnName,
              type:
                getValueByHeaderKeys(["type", "column_type", "data_type"]) ||
                activeTabNode.description ||
                "",
              nullable: getValueByHeaderKeys(["null", "is_nullable", "nullable"]) || "",
              defaultValue: getValueByHeaderKeys(["default", "column_default", "dflt_value"]) || "",
              isPrimaryKey: isPrimaryKey,
              extra: getValueByHeaderKeys(["extra", "column_comment", "comment"]) || "",
              tableName: tableName || activeTabNode.path[activeTabNode.path.length - 3]?.config_value || "",
              rawInfo: info,
            });
          } else {
            // 没找到匹配行，用节点基本信息兜底
            setColumnInfo({
              name: targetColumnName,
              type: activeTabNode.description || "未知",
              nullable: "",
              defaultValue: "",
              isPrimaryKey: activeTabNode.iconName === "primary",
              extra: "",
              tableName: tableName || activeTabNode.path[activeTabNode.path.length - 3]?.config_value || "",
              rawInfo: null,
            });
          }
        } else {
          setError("无法获取列信息。");
        }
      } catch (err) {
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColumnDetails();
  }, [activeTabNode, tableName]);

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

    if (!columnInfo) return null;

    return (
      <div className="space-y-4" style={{ fontSize: "12px" }}>
        <table className="table table-zebra w-full">
          <tbody>
            <tr>
              <th className="w-[120px]">列名</th>
              <td className="font-mono font-semibold">{columnInfo.name}</td>
            </tr>
            <tr>
              <th>数据类型</th>
              <td className="font-mono">{columnInfo.type}</td>
            </tr>
            <tr>
              <th>是否主键</th>
              <td>
                {columnInfo.isPrimaryKey ? (
                  <span className="badge badge-primary badge-sm">是</span>
                ) : (
                  <span className="badge badge-ghost badge-sm">否</span>
                )}
              </td>
            </tr>
            <tr>
              <th>可为空</th>
              <td>{columnInfo.nullable}</td>
            </tr>
            <tr>
              <th>默认值</th>
              <td className="font-mono">{String(columnInfo.defaultValue)}</td>
            </tr>
            {columnInfo.extra && (
              <tr>
                <th>额外信息</th>
                <td>{String(columnInfo.extra)}</td>
              </tr>
            )}
            <tr>
              <th>所属表</th>
              <td>{columnInfo.tableName}</td>
            </tr>
          </tbody>
        </table>

        {/* 如果有原始信息，显示完整字段 */}
        {columnInfo.rawInfo && (
          <>
            <div className="divider text-base-content/50 text-xs">完整字段</div>
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(columnInfo.rawInfo).map(([key, value]) => (
                  <tr key={key}>
                    <td className="font-mono text-base-content/70">{key}</td>
                    <td className="font-mono">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="tabs tabs-boxed mb-4 self-start">
        <a className="tab tab-active">基本信息</a>
      </div>
      <div className="flex-grow overflow-auto">{renderContent()}</div>
    </div>
  );
}

export default ColumnDetailPage;
