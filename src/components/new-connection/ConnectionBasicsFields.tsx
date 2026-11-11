import type { ConnectionDraft } from "../../utils/connectionForm";

export interface ConnectionBasicsFieldsProps {
  draft: ConnectionDraft;
  error: string;
  isEditMode: boolean;
  canUseHostMode: boolean;
  onChange: (patch: Partial<ConnectionDraft>) => void;
  onDbTypeChange: (value: string) => void;
}

const DB_TYPE_OPTIONS = [
  { value: "sqlite", label: "SQLite" },
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "oracle", label: "Oracle" },
  { value: "mongodb", label: "MongoDB" },
  { value: "redis", label: "Redis" },
  { value: "clickhouse", label: "ClickHouse" },
  { value: "elasticsearch", label: "Elasticsearch" },
  { value: "s3", label: "S3 / OSS" },
  { value: "webdav", label: "WebDAV" },
  { value: "kafka", label: "Kafka" },
  { value: "rocketmq", label: "RocketMQ" },
] as const;

/** 连接名称、数据库类型与 URL/Host 模式切换。 */
function ConnectionBasicsFields({
  draft,
  error,
  isEditMode,
  canUseHostMode,
  onChange,
  onDbTypeChange,
}: ConnectionBasicsFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-name">
          <span className="text-lg font-semibold">
            连接名称 <span className="text-error">*</span>
          </span>
        </label>
        <input
          id="conn-name"
          name="connectionName"
          type="text"
          placeholder="例如：我的测试库"
          autoComplete="off"
          required
          aria-required="true"
          className={`input w-full ${
            error.includes("名称") ? "input-error" : ""
          }`}
          value={draft.connectionName}
          onChange={(e) => onChange({ connectionName: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-type">
          <span className="text-lg font-semibold">数据库类型</span>
        </label>
        <select
          id="conn-type"
          name="dbType"
          className="select w-full"
          value={draft.dbType}
          onChange={(e) => onDbTypeChange(e.target.value)}
          disabled={isEditMode} // 编辑模式下通常不允许修改类型
        >
          {DB_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {canUseHostMode && (
        <div
          role="tablist"
          aria-label="连接方式"
          className="tabs tabs-box w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={draft.connectionMode === "url"}
            className={`tab ${
              draft.connectionMode === "url" ? "tab-active" : ""
            }`}
            onClick={() => onChange({ connectionMode: "url" })}
          >
            URL 模式
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={draft.connectionMode === "host"}
            className={`tab ${
              draft.connectionMode === "host" ? "tab-active" : ""
            }`}
            onClick={() => onChange({ connectionMode: "host" })}
          >
            Host 模式
          </button>
        </div>
      )}
    </>
  );
}

export default ConnectionBasicsFields;
