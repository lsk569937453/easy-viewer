import type { ConnectionFieldProps } from "./types";

/** S3 / OSS：Endpoint + AK/SK + Region。 */
function S3Fields({ draft, error, onChange }: ConnectionFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="s3-endpoint">
          <span className="text-xs font-medium">
            Endpoint <span className="text-error">*</span>
          </span>
        </label>
        <div className="flex gap-2">
          <input
            id="s3-endpoint"
            name="endpoint"
            type="text"
            placeholder="例如: s3.amazonaws.com 或 oss-cn-hangzhou.aliyuncs.com"
            autoComplete="off"
            spellCheck={false}
            className={`input flex-1 ${
              error.includes("Endpoint") || error.includes("主机")
                ? "input-error"
                : ""
            }`}
            value={draft.host}
            onChange={(e) => onChange({ host: e.target.value })}
          />
          <input
            id="s3-port"
            name="port"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="端口"
            placeholder="443"
            className={`input w-24 ${
              error.includes("端口") ? "input-error" : ""
            }`}
            value={draft.port}
            onChange={(e) => onChange({ port: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="s3-access-key">
          <span className="text-xs font-medium">
            Access Key <span className="text-error">*</span>
          </span>
        </label>
        <input
          id="s3-access-key"
          name="accessKey"
          type="text"
          placeholder="例如: AKIAIOSFODNN7EXAMPLE"
          autoComplete="off"
          spellCheck={false}
          className={`input w-full ${
            error.includes("Access Key") ? "input-error" : ""
          }`}
          value={draft.username}
          onChange={(e) => onChange({ username: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="s3-secret-key">
          <span className="text-xs font-medium">
            Secret Key <span className="text-error">*</span>
          </span>
        </label>
        <input
          id="s3-secret-key"
          name="secretKey"
          type="password"
          placeholder="请输入 Secret Key…"
          autoComplete="off"
          className="input w-full"
          value={draft.password}
          onChange={(e) => onChange({ password: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="s3-region">
          <span className="text-xs font-medium">
            Region (可选，默认 us-east-1)
          </span>
        </label>
        <input
          id="s3-region"
          name="region"
          type="text"
          placeholder="例如: us-east-1 或 cn-hangzhou"
          autoComplete="off"
          spellCheck={false}
          className="input w-full"
          value={draft.databaseName}
          onChange={(e) => onChange({ databaseName: e.target.value })}
        />
      </div>
    </div>
  );
}

export default S3Fields;
