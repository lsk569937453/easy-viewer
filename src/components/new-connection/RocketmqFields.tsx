import type { ConnectionFieldProps } from "./types";

/** RocketMQ：Proxy 地址 + 可选 AK/SK + Topics。 */
function RocketmqFields({ draft, error, onChange }: ConnectionFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="rmq-host">
          <span className="text-xs font-medium">
            Proxy 地址 <span className="text-error">*</span>
          </span>
        </label>
        <div className="flex gap-2">
          <input
            id="rmq-host"
            name="host"
            type="text"
            placeholder="例如: localhost"
            autoComplete="off"
            spellCheck={false}
            className={`input flex-1 ${
              error.includes("主机") ? "input-error" : ""
            }`}
            value={draft.host}
            onChange={(e) => onChange({ host: e.target.value })}
          />
          <input
            id="rmq-port"
            name="port"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="端口"
            placeholder="8081"
            className={`input w-24 ${
              error.includes("端口") ? "input-error" : ""
            }`}
            value={draft.port}
            onChange={(e) => onChange({ port: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="rmq-access-key">
          <span className="text-xs font-medium">Access Key (可选)</span>
        </label>
        <input
          id="rmq-access-key"
          name="accessKey"
          type="text"
          placeholder="例如: your-access-key"
          autoComplete="off"
          spellCheck={false}
          className="input w-full"
          value={draft.username}
          onChange={(e) => onChange({ username: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="rmq-secret-key">
          <span className="text-xs font-medium">Secret Key (可选)</span>
        </label>
        <input
          id="rmq-secret-key"
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
        <label className="label" htmlFor="rmq-topics">
          <span className="text-xs font-medium">
            Topics <span className="text-error">*</span>
          </span>
        </label>
        <textarea
          id="rmq-topics"
          name="topics"
          autoComplete="off"
          spellCheck={false}
          className="textarea h-24 font-mono text-sm"
          placeholder="输入 Topic 名称，逗号或换行分隔&#10;例如: topic1, topic2, topic3"
          value={draft.rmqTopics}
          onChange={(e) => onChange({ rmqTopics: e.target.value })}
        />
        <span className="text-micro text-base-content/45 px-2 pt-1">
          逗号或换行分隔多个 Topic
        </span>
      </div>
    </div>
  );
}

export default RocketmqFields;
