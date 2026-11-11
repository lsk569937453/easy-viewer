import type { ConnectionFieldProps } from "./types";

/** WebDAV：服务器地址 + 可选账号 + 远程目录 + HTTPS 开关。 */
function WebdavFields({ draft, error, onChange }: ConnectionFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="dav-host">
          <span className="text-xs font-medium">
            服务器地址 <span className="text-error">*</span>
          </span>
        </label>
        <div className="flex gap-2">
          <input
            id="dav-host"
            name="host"
            type="text"
            placeholder="例如: dav.jianguoyun.com 或 192.168.1.10"
            autoComplete="off"
            spellCheck={false}
            className={`input flex-1 ${
              error.includes("服务器地址") ? "input-error" : ""
            }`}
            value={draft.host}
            onChange={(e) => onChange({ host: e.target.value })}
          />
          <input
            id="dav-port"
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
        <label className="label" htmlFor="dav-username">
          <span className="text-xs font-medium">用户名 (可选)</span>
        </label>
        <input
          id="dav-username"
          name="username"
          type="text"
          placeholder="例如: user@example.com"
          autoComplete="off"
          spellCheck={false}
          className="input w-full"
          value={draft.username}
          onChange={(e) => onChange({ username: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="dav-password">
          <span className="text-xs font-medium">密码 (可选)</span>
        </label>
        <input
          id="dav-password"
          name="password"
          type="password"
          placeholder="请输入密码或应用密码…"
          autoComplete="off"
          className="input w-full"
          value={draft.password}
          onChange={(e) => onChange({ password: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="dav-root">
          <span className="text-xs font-medium">远程目录 (可选，默认 /)</span>
        </label>
        <input
          id="dav-root"
          name="remotePath"
          type="text"
          placeholder="例如: /dav/ 或 /remote.php/dav/files/username"
          autoComplete="off"
          spellCheck={false}
          className="input w-full"
          value={draft.databaseName}
          onChange={(e) => onChange({ databaseName: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label cursor-pointer" htmlFor="dav-use-tls">
          <span className="text-xs font-medium">使用 HTTPS (TLS)</span>
          <input
            id="dav-use-tls"
            name="useTls"
            type="checkbox"
            className="toggle toggle-primary"
            checked={draft.useTls}
            onChange={(e) => onChange({ useTls: e.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}

export default WebdavFields;
