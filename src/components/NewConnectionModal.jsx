// src/components/NewConnectionModal.jsx
import React, { useState, useEffect } from "react";
// 引入 Tauri invoke API
import { invoke } from "@tauri-apps/api/core";
// 移除 useToast 导入

/**
 * 新建数据库连接模态框组件。
 *
 * @param {object} props
 * @param {boolean} props.isOpen - 控制模态框是否可见。
 * @param {function} props.onClose - 关闭模态框的回调函数。
 * @param {function} props.onCreateConnection - 创建连接的回调函数，参数为 { dbType, connectionString }。
 */
function NewConnectionModal({ isOpen, onClose, onCreateConnection }) {
  // 移除 useToast 初始化

  const [dbType, setDbType] = useState("sqlite"); // 默认选择 SQLite
  const [connectionMode, setConnectionMode] = useState("url"); // 'url' 或 'host'，默认选择 URL 模式
  const [connectionString, setConnectionString] = useState("");

  // Host 模式连接所需的 states
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [databaseName, setDatabaseName] = useState(""); // 用于数据库名或 Oracle 的服务名/SID

  const [error, setError] = useState("");
  const [isTesting, setIsTesting] = useState(false); // 控制测试按钮的加载状态
  const [testResult, setTestResult] = useState(null); // 'success' 或 'failure'
  const [testMessage, setTestMessage] = useState("");

  // 定义支持 Host 模式的传统数据库类型
  const traditionalDbTypes = ["mysql", "oracle"]; // 如果需要，可以添加 'postgresql'

  // 模态框打开时重置所有状态
  useEffect(() => {
    if (isOpen) {
      setDbType("sqlite");
      setConnectionMode("url"); // 默认回退到 URL 模式
      setConnectionString("");
      setHost("");
      setPort("");
      setUsername("");
      setPassword("");
      setDatabaseName("");
      setError("");
      setIsTesting(false);
      setTestResult(null);
      setTestMessage("");
    }
  }, [isOpen]);

  // 数据库类型改变时，重置连接模式和 Host 模式的输入字段
  useEffect(() => {
    if (dbType === "sqlite") {
      setConnectionMode("url"); // SQLite 数据库只支持 URL 模式
    } else if (!traditionalDbTypes.includes(dbType)) {
      // 如果是非传统数据库且不在支持 Host 模式的列表里，也默认回退到 URL 模式
      setConnectionMode("url");
    }

    // 清空 Host 模式下的输入字段，避免切换数据库类型时残留旧数据
    setHost("");
    setPort("");
    setUsername("");
    setPassword("");
    setDatabaseName("");
    setTestResult(null); // 清除测试结果
    setTestMessage(""); // 清除测试信息
    setError(""); // 清除错误信息
  }, [dbType]);

  if (!isOpen) {
    return null;
  }

  /**
   * 辅助函数：解析 MySQL 连接 URL。
   * 示例: mysql://user:password@host:port/database_name
   * @param {string} url
   * @returns {{host: string, port: number, database: string, user_name: string, password: string}}
   */
  const parseMysqlUrl = (url) => {
    // 增加对可选密码和数据库名的支持
    const regex =
      /^mysql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) {
      throw new Error("无效的 MySQL URL 格式。");
    }
    // 解构匹配结果, 确保对 undefined 的处理
    const [, user, pass, host, port, database] = match;

    return {
      host: host || "",
      port: parseInt(port, 10) || 3306,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  /**
   * 辅助函数：解析 Oracle 连接 URL。
   * 示例: oracle://user:password@host:port/service_name
   * @param {string} url
   * @returns {{host: string, port: number, database: string, user_name: string, password: string}}
   */
  const parseOracleUrl = (url) => {
    // 增加对可选密码和数据库/服务名 (databaseName) 的支持
    const regex =
      /^oracle:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) {
      throw new Error("无效的 Oracle URL 格式。");
    }
    const [, user, pass, host, port, serviceName] = match;

    return {
      host: host || "",
      port: parseInt(port, 10) || 1521, // Oracle 默认端口
      database: serviceName || "", // 在 Oracle 中，这通常是服务名或 SID
      user_name: user || "",
      password: pass || "",
    };
  };

  /**
   * 根据 Host 模式的输入字段构建连接字符串。
   * 这个函数主要用于 `onCreateConnection` 回调和 `handleCreate`。
   * @returns {string} 构建好的连接字符串。
   */
  const buildConnectionStringFromHost = () => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanDatabaseName = databaseName.trim();

    let constructedString = "";
    switch (dbType) {
      case "mysql":
        // 如果有用户名和密码，则包含它们，否则省略
        const mysqlAuth = cleanUsername
          ? `${cleanUsername}${cleanPassword ? `:${cleanPassword}` : ""}@`
          : "";
        constructedString = `mysql://${mysqlAuth}${cleanHost}:${cleanPort}/${cleanDatabaseName}`;
        break;
      case "oracle":
        const oracleAuth = cleanUsername
          ? `${cleanUsername}${cleanPassword ? `:${cleanPassword}` : ""}@`
          : "";
        const oracleServicePart = cleanDatabaseName
          ? `/${cleanDatabaseName}`
          : "";
        constructedString = `oracle://${oracleAuth}${cleanHost}:${cleanPort}${oracleServicePart}`;
        break;
      default:
        // 对于不支持 Host 模式的数据库类型，可能返回空字符串或抛出错误
        return "";
    }
    return constructedString;
  };

  /**
   * 获取 Host 模式的连接详细信息（用于传递给后端 invoke）。
   * @returns {{isValid: boolean, message?: string, details?: { host: string, port: number, user_name: string, password: string, database: string }}}
   */
  const getHostConnectionDetails = () => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanDatabaseName = databaseName.trim();

    if (!cleanHost) {
      return { isValid: false, message: "主机不能为空！" };
    }
    const parsedPort = parseInt(cleanPort, 10);
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      return { isValid: false, message: "端口必须是有效的数字 (1-65535)！" };
    }
    if (!cleanUsername) {
      return { isValid: false, message: "用户名不能为空！" };
    }

    return {
      isValid: true,
      details: {
        host: cleanHost,
        port: parsedPort,
        user_name: cleanUsername,
        password: cleanPassword,
        database: cleanDatabaseName, // 可以为空
      },
    };
  };

  // 验证表单是否有效，用于控制“测试连接”和“创建”按钮的禁用状态
  const isFormValid = () => {
    if (connectionMode === "url") {
      return connectionString.trim() !== "";
    } else {
      // host mode
      // 主机、端口、用户名在 Host 模式下是必填项
      const { isValid } = getHostConnectionDetails();
      return isValid;
    }
  };

  // 处理创建连接的逻辑
  const handleCreate = (e) => {
    e.preventDefault();
    setError("");
    setTestResult(null);

    let finalConnectionString = "";
    let currentError = "";

    if (connectionMode === "url") {
      if (!connectionString.trim()) {
        currentError = "连接字符串不能为空！";
      }
      finalConnectionString = connectionString;
    } else {
      // connectionMode === "host"
      const { isValid, message } = getHostConnectionDetails(); // 仅用于验证
      if (!isValid) {
        currentError = message;
      } else {
        finalConnectionString = buildConnectionStringFromHost(); // 构建字符串用于 onCreateConnection
      }
    }

    if (currentError) {
      setError(currentError);
      return;
    }

    if (testResult === "failure") {
      if (!window.confirm("连接测试失败，确定仍要创建此连接吗？")) {
        return;
      }
    }

    console.log(
      `尝试创建 ${dbType} 连接，连接字符串: ${finalConnectionString}`
    );
    onCreateConnection({ dbType, connectionString: finalConnectionString });
    onClose();
  };

  // 处理测试连接的逻辑
  const handleTestConnection = async () => {
    setError("");
    setTestResult(null);
    setTestMessage("");
    setIsTesting(true); // 开始测试，设置加载状态

    let connectionDetailsForBackend = null;
    let currentError = "";
    let finalConnectionStringForCreate = ""; // 记录最终的连接字符串，用于如果测试通过，可以直接创建

    try {
      if (connectionMode === "url") {
        if (!connectionString.trim()) {
          currentError = "连接字符串不能为空，无法测试！";
        } else {
          finalConnectionStringForCreate = connectionString.trim(); // URL模式下，最终字符串就是输入的
          try {
            if (dbType === "mysql") {
              connectionDetailsForBackend = parseMysqlUrl(connectionString);
            } else if (dbType === "oracle") {
              connectionDetailsForBackend = parseOracleUrl(connectionString);
            } else {
              currentError = `URL模式暂不支持 ${dbType} 类型数据库的后端解析测试。`;
            }
          } catch (err) {
            currentError = err.message;
          }
        }
      } else {
        // connectionMode === "host"
        const { isValid, message, details } = getHostConnectionDetails();
        if (!isValid) {
          currentError = message;
        } else {
          connectionDetailsForBackend = details;
          finalConnectionStringForCreate = buildConnectionStringFromHost(); // Host模式下，构建字符串
        }
      }

      if (currentError) {
        setError(currentError);
        // 移除 toast
        return;
      }

      if (!connectionDetailsForBackend) {
        setError("无法构建有效的连接配置用于测试。");
        // 移除 toast
        return;
      }

      // 构造 Tauri invoke 期望的请求体
      const testDatabaseRequest = {
        base_config_enum: {
          [dbType]: {
            // e.g., "mysql", "oracle"
            config: {
              host: connectionDetailsForBackend.host,
              port: connectionDetailsForBackend.port,
              database: connectionDetailsForBackend.database,
              user_name: connectionDetailsForBackend.user_name,
              password: connectionDetailsForBackend.password,
            },
          },
        },
      };

      console.log(
        `正在测试 ${dbType} 连接，请求体: ${JSON.stringify(
          testDatabaseRequest
        )}`
      );

      const datass = await invoke("test_url", {
        testDatabaseRequest: testDatabaseRequest,
      });

      const { response_code, response_msg } = JSON.parse(datass);

      if (response_code === 0) {
        setTestResult("success");
        setTestMessage("连接测试成功！");
        // 移除 toast
        // 如果测试成功，将最终的连接字符串保存起来，方便后续创建
        setConnectionString(finalConnectionStringForCreate);
      } else {
        setTestResult("failure");
        setTestMessage(`连接测试失败: ${response_msg}`);
        // 移除 toast
      }
    } catch (err) {
      setTestResult("failure");
      setTestMessage(`连接测试异常: ${err.toString()}`);
      setError(`连接测试异常: ${err.toString()}`);
      // 移除 toast
      console.error("连接测试异常:", err);
    } finally {
      setIsTesting(false); // 结束测试，解除加载状态
    }
  };

  // 获取 URL 模式下连接字符串的 placeholder 文本
  const getUrlPlaceholder = () => {
    switch (dbType) {
      case "sqlite":
        return "例如: /path/to/your/database.db 或 :memory:";
      case "mysql":
        return "例如: mysql://user:password@host:port/database_name";
      case "oracle":
        return "例如: oracle://user:password@host:port/service_name";
      default:
        return "请输入连接字符串";
    }
  };

  // 判断当前数据库类型是否支持 Host 模式
  const canUseHostMode = traditionalDbTypes.includes(dbType);

  return (
    <dialog id="new_connection_modal" className="modal" open={isOpen}>
      <div className="modal-box max-w-lg bg-base-100 shadow-xl rounded-lg p-6">
        <h3 className="font-bold text-2xl text-primary mb-4 border-b border-base-content/20 pb-2">
          新建数据库连接
        </h3>

        <form onSubmit={handleCreate}>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">数据库类型</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={dbType}
                onChange={(e) => {
                  setDbType(e.target.value);
                  // 其他状态重置由 useEffect 钩子处理
                }}
              >
                <option value="sqlite">SQLite</option>
                <option value="mysql">MySQL</option>
                <option value="oracle">Oracle</option>
                {/* 如果需要，可以在这里添加 PostgreSQL 选项 */}
              </select>
            </div>

            {/* 当数据库类型支持 Host 模式时，显示 URL 和 Host 模式的 Tab 选项 */}
            {canUseHostMode && (
              <div role="tablist" className="tabs tabs-boxed w-fit">
                <a
                  role="tab"
                  className={`tab ${
                    connectionMode === "url" ? "tab-active" : ""
                  }`}
                  onClick={() => {
                    setConnectionMode("url");
                    setError(""); // 切换模式时清除错误
                    setTestResult(null); // 清除测试结果
                    setTestMessage(""); // 清除测试信息
                  }}
                >
                  URL模式
                </a>
                <a
                  role="tab"
                  className={`tab ${
                    connectionMode === "host" ? "tab-active" : ""
                  }`}
                  onClick={() => {
                    setConnectionMode("host");
                    setError(""); // 切换模式时清除错误
                    setTestResult(null); // 清除测试结果
                    setTestMessage(""); // 清除测试信息
                  }}
                >
                  Host模式
                </a>
              </div>
            )}

            {/* 根据连接模式渲染不同的输入表单 */}
            {connectionMode === "url" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-lg">连接字符串</span>
                </label>
                <input
                  type="text"
                  placeholder={getUrlPlaceholder()}
                  className={`input input-bordered w-full ${
                    error ? "input-error" : ""
                  }`}
                  value={connectionString}
                  onChange={(e) => {
                    setConnectionString(e.target.value);
                    setTestResult(null);
                    setTestMessage("");
                    setError(""); // 用户输入时清除错误
                  }}
                />
                {error && (
                  <label className="label">
                    <span className="label-text-alt text-error">{error}</span>
                  </label>
                )}
              </div>
            )}

            {connectionMode === "host" && (
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      主机 <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如: localhost 或 192.168.1.1"
                    className={`input input-bordered w-full ${
                      error && error.includes("主机") ? "input-error" : ""
                    }`}
                    value={host}
                    onChange={(e) => {
                      setHost(e.target.value);
                      setError("");
                      setTestResult(null);
                      setTestMessage("");
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      端口 <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={
                      dbType === "mysql"
                        ? "3306"
                        : dbType === "oracle"
                        ? "1521"
                        : ""
                    }
                    className={`input input-bordered w-full ${
                      error && error.includes("端口") ? "input-error" : ""
                    }`}
                    value={port}
                    onChange={(e) => {
                      setPort(e.target.value);
                      setError("");
                      setTestResult(null);
                      setTestMessage("");
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      用户名 <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如: root 或 system"
                    className={`input input-bordered w-full ${
                      error && error.includes("用户名") ? "input-error" : ""
                    }`}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                      setTestResult(null);
                      setTestMessage("");
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">密码</span>
                  </label>
                  <input
                    type="password"
                    placeholder="请输入密码"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                      setTestResult(null);
                      setTestMessage("");
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      {dbType === "oracle"
                        ? "服务名/SID (可选)"
                        : "数据库名 (可选)"}
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={
                      dbType === "oracle"
                        ? "例如: ORCL 或 xe"
                        : "例如: mydatabase"
                    }
                    className="input input-bordered w-full"
                    value={databaseName}
                    onChange={(e) => {
                      setDatabaseName(e.target.value);
                      setError("");
                      setTestResult(null);
                      setTestMessage("");
                    }}
                  />
                </div>
                {error && (
                  <label className="label">
                    <span className="label-text-alt text-error">{error}</span>
                  </label>
                )}
              </div>
            )}

            {/* 连接测试结果提示 */}
            {testResult && (
              <div
                className={`alert ${
                  testResult === "success" ? "alert-success" : "alert-error"
                } shadow-lg`}
              >
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current flex-shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={
                        testResult === "success"
                          ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      }
                    />
                  </svg>
                  <span>{testMessage}</span>
                </div>
              </div>
            )}
          </div>

          <div className="modal-action mt-6">
            <button
              type="button"
              className={`btn btn-info ${isTesting ? "loading" : ""}`}
              onClick={handleTestConnection}
              disabled={isTesting || !isFormValid()}
            >
              {isTesting ? "测试中..." : "测试连接"}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isTesting || !isFormValid()}
            >
              创建
            </button>

            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export default NewConnectionModal;
