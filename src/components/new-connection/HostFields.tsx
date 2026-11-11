import type { ConnectionFieldProps } from "./types";

/** Host 模式：主机 / 端口 / 用户名 / 密码 / 库名。 */
function HostFields({ draft, error, onChange }: ConnectionFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-host">
          <span className="text-xs font-medium">
            主机 <span className="text-error">*</span>
          </span>
        </label>
        <input
          id="conn-host"
          name="host"
          type="text"
          placeholder="例如: localhost 或 192.168.1.1"
          autoComplete="off"
          spellCheck={false}
          className={`input w-full ${
            error.includes("主机") ? "input-error" : ""
          }`}
          value={draft.host}
          onChange={(e) => onChange({ host: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-port">
          <span className="text-xs font-medium">
            端口 <span className="text-error">*</span>
          </span>
        </label>
        <input
          id="conn-port"
          name="port"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={
            draft.dbType === "mysql"
              ? "3306"
              : draft.dbType === "postgresql"
                ? "5432"
                : draft.dbType === "mongodb"
                  ? "27017"
                  : draft.dbType === "redis"
                    ? "6379"
                    : draft.dbType === "clickhouse"
                      ? "8123"
                      : draft.dbType === "elasticsearch"
                        ? "9200"
                        : "1521"
          }
          className={`input w-full ${
            error.includes("端口") ? "input-error" : ""
          }`}
          value={draft.port}
          onChange={(e) => onChange({ port: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-username">
          <span className="text-xs font-medium">
            用户名{" "}
            {draft.dbType !== "redis" && draft.dbType !== "elasticsearch" && (
              <span className="text-error">*</span>
            )}
          </span>
        </label>
        <input
          id="conn-username"
          name="username"
          type="text"
          placeholder="例如: root 或 system"
          autoComplete="off"
          spellCheck={false}
          className={`input w-full ${
            error.includes("用户名") ? "input-error" : ""
          }`}
          value={draft.username}
          onChange={(e) => onChange({ username: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-password">
          <span className="text-xs font-medium">密码</span>
        </label>
        <input
          id="conn-password"
          name="password"
          type="password"
          placeholder="请输入密码…"
          autoComplete="off"
          className="input w-full"
          value={draft.password}
          onChange={(e) => onChange({ password: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="conn-dbname">
          <span className="text-xs font-medium">
            {draft.dbType === "oracle"
              ? "服务名/SID (可选)"
              : draft.dbType === "postgresql"
                ? "数据库名"
                : draft.dbType === "redis"
                  ? "数据库索引 (可选，默认0)"
                  : "数据库名 (可选)"}
          </span>
        </label>
        <input
          id="conn-dbname"
          name="databaseName"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={
            draft.dbType === "oracle"
              ? "例如: ORCL 或 xe"
              : draft.dbType === "redis"
                ? "例如: 0"
                : "例如: mydatabase"
          }
          className="input w-full"
          value={draft.databaseName}
          onChange={(e) => onChange({ databaseName: e.target.value })}
        />
      </div>
    </div>
  );
}

export default HostFields;
