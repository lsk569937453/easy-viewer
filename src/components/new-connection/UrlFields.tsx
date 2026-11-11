import { getUrlPlaceholder } from "../../utils/connectionUrl";
import type { ConnectionFieldProps } from "./types";

export interface UrlFieldsProps extends ConnectionFieldProps {
  onSelectSqliteFile: () => void;
}

/** URL 模式：SQLite 走文件选择，其余类型填写连接字符串。 */
function UrlFields({
  draft,
  error,
  onChange,
  onSelectSqliteFile,
}: UrlFieldsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {draft.dbType === "sqlite" ? (
        <>
          <label className="label" htmlFor="conn-sqlite-file">
            <span className="text-lg font-semibold">
              数据库文件 <span className="text-error">*</span>
            </span>
          </label>
          <div className="join w-full">
            <input
              id="conn-sqlite-file"
              name="sqliteFile"
              type="text"
              placeholder="点击右侧按钮选择文件…"
              readOnly
              className={`input join-item w-full ${
                error.includes("路径") ? "input-error" : ""
              }`}
              value={draft.connectionString}
            />
            <button
              type="button"
              className="btn btn-primary join-item"
              onClick={onSelectSqliteFile}
            >
              选择文件
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="label" htmlFor="conn-url">
            <span className="text-lg font-semibold">
              连接字符串 <span className="text-error">*</span>
            </span>
          </label>
          <input
            id="conn-url"
            name="connectionString"
            type="text"
            placeholder={getUrlPlaceholder(draft.dbType)}
            autoComplete="off"
            spellCheck={false}
            className={`input w-full ${
              error.includes("字符串") ? "input-error" : ""
            }`}
            value={draft.connectionString}
            onChange={(e) => onChange({ connectionString: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

export default UrlFields;
