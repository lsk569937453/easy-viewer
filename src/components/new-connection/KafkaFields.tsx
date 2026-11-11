import type { ConnectionFieldProps } from "./types";

/** Kafka：只需要 broker 地址（host + port）。 */
function KafkaFields({ draft, error, onChange }: ConnectionFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="kafka-host">
          <span className="text-xs font-medium">
            Broker 地址 <span className="text-error">*</span>
          </span>
        </label>
        <div className="flex gap-2">
          <input
            id="kafka-host"
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
            id="kafka-port"
            name="port"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="端口"
            placeholder="9092"
            className={`input w-24 ${
              error.includes("端口") ? "input-error" : ""
            }`}
            value={draft.port}
            onChange={(e) => onChange({ port: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export default KafkaFields;
