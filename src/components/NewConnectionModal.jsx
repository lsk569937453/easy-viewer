import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast"; // 导入 toast

const generateRandomString = (length) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// START_OF_MODIFICATION
// 将 onCreationSuccess prop 重命名为 onSaveSuccess，使其更通用
function NewConnectionModal({ isOpen, onClose, onSaveSuccess, editingId }) {
  // END_OF_MODIFICATION
  const [connectionName, setConnectionName] = useState("");
  const [dbType, setDbType] = useState("sqlite");
  const [connectionMode, setConnectionMode] = useState("url");
  const [connectionString, setConnectionString] = useState("");

  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [databaseName, setDatabaseName] = useState("");

  const [error, setError] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMessage, setTestMessage] = useState("");
  const isEditMode = !!editingId;

  const traditionalDbTypes = ["mysql", "oracle"];

  const resetForm = () => {
    const initialDbType = "sqlite";
    setDbType(initialDbType);
    setConnectionName(`${initialDbType}-${generateRandomString(4)}`);
    setConnectionMode("url");
    setConnectionString("");
    setHost("");
    setPort("");
    setUsername("");
    setPassword("");
    setDatabaseName("");
    setError("");
    setIsTesting(false);
    setIsCreating(false);
    setTestResult(null);
    setTestMessage("");
  };

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        const fetchConnectionDetails = async () => {
          try {
            const jsonResponse = await invoke("get_base_config_by_id", {
              baseConfigId: editingId,
            });
            const { response_code, response_msg } = JSON.parse(jsonResponse);

            if (response_code === 0 && response_msg) {
              // --- START: MODIFIED PARSING LOGIC ---

              // 1. The main connection details are in a string field `connection_json`.
              //    We need to parse this string to get the configuration object.
              const connectionConfig = JSON.parse(response_msg.connection_json);
              const baseConfigEnum = connectionConfig.base_config_enum;

              // 2. Set the connection name from the top-level field.
              setConnectionName(response_msg.connection_name);

              // 3. Determine the database type from the key of `base_config_enum`.
              const dbTypeKey = Object.keys(baseConfigEnum)[0];
              setDbType(dbTypeKey);

              // 4. Populate form fields based on the database type.
              if (dbTypeKey === "sqlite") {
                setConnectionMode("url");
                setConnectionString(baseConfigEnum.sqlite.file_path);
                // Clear other fields to ensure a clean state
                setHost("");
                setPort("");
                setUsername("");
                setPassword("");
                setDatabaseName("");
              } else {
                // This handles 'mysql', 'oracle', etc.
                const config = baseConfigEnum[dbTypeKey].config;
                setHost(config.host || "");
                setPort(config.port ? String(config.port) : ""); // Ensure port is a string for the input field
                setUsername(config.user_name || "");
                setPassword(config.password || ""); // Note: Password might not be sent back for security
                setDatabaseName(config.database || "");

                // When editing, it's often more user-friendly to default to Host mode
                // as it displays all the details clearly.
                setConnectionMode("host");
                setConnectionString(""); // Clear URL string
              }
              // --- END: MODIFIED PARSING LOGIC ---
            } else {
              setError(`获取连接信息失败: ${response_msg}`);
            }
          } catch (err) {
            setError(`获取连接信息时出错: ${err.toString()}`);
            console.error("Failed to fetch connection details:", err);
          }
        };

        fetchConnectionDetails();
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingId]);

  useEffect(() => {
    // This effect should be skipped when initially populating the form in edit mode
    if (!isOpen) {
      setConnectionString("");
      if (dbType === "sqlite" || !traditionalDbTypes.includes(dbType)) {
        setConnectionMode("url");
      }
      setHost("");
      setPort("");
      setUsername("");
      setPassword("");
      setDatabaseName("");
      setTestResult(null);
      setTestMessage("");
      setError("");
    }
  }, [dbType, isOpen]); // Added isOpen dependency

  if (!isOpen) {
    return null;
  }

  const handleSelectSqliteFile = async () => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (typeof selected === "string" && selected) {
        setConnectionString(selected);
        setError("");
        setTestResult(null);
        setTestMessage("");
      }
    } catch (err) {
      console.error("文件选择失败:", err);
      setError("无法打开文件选择器。");
    }
  };

  const parseMysqlUrl = (url) => {
    const regex =
      /^mysql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 MySQL URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port, 10) || 3306,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parseOracleUrl = (url) => {
    const regex =
      /^oracle:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 Oracle URL 格式。");
    const [, user, pass, host, port, serviceName] = match;
    return {
      host: host || "",
      port: parseInt(port, 10) || 1521,
      database: serviceName || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const getHostConnectionDetails = () => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanDatabaseName = databaseName.trim();
    if (!cleanHost) return { isValid: false, message: "主机不能为空！" };
    const parsedPort = parseInt(cleanPort, 10);
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      return { isValid: false, message: "端口必须是有效的数字 (1-65535)！" };
    }
    if (!cleanUsername) return { isValid: false, message: "用户名不能为空！" };
    return {
      isValid: true,
      details: {
        host: cleanHost,
        port: parsedPort,
        user_name: cleanUsername,
        password: cleanPassword,
        database: cleanDatabaseName,
      },
    };
  };

  const isFormValid = () => {
    if (connectionName.trim() === "") return false;
    if (connectionMode === "url") {
      return connectionString.trim() !== "";
    } else {
      return getHostConnectionDetails().isValid;
    }
  };

  // 处理创建/更新连接的逻辑
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setTestResult(null);

    if (!isFormValid()) {
      setError("表单信息不完整，请检查必填项。");
      return;
    }

    if (testResult === "failure") {
      if (!window.confirm("连接测试失败，确定仍要保存此连接吗？")) {
        return;
      }
    }

    setIsCreating(true);

    try {
      let baseConfigEnum = null;

      if (dbType === "sqlite") {
        baseConfigEnum = {
          sqlite: {
            file_path: connectionString.trim(),
          },
        };
      } else if (connectionMode === "url") {
        let details;
        if (dbType === "mysql") {
          details = parseMysqlUrl(connectionString.trim());
        } else if (dbType === "oracle") {
          details = parseOracleUrl(connectionString.trim());
        } else {
          throw new Error(`不支持的数据库类型: ${dbType}`);
        }
        baseConfigEnum = { [dbType]: { config: details } };
      } else {
        // Host 模式
        const { isValid, message, details } = getHostConnectionDetails();
        if (!isValid) throw new Error(message);
        baseConfigEnum = { [dbType]: { config: details } };
      }

      // START_OF_MODIFICATION
      let responseJson;
      let invokeCommand;
      let requestBody;

      if (isEditMode) {
        // 构建 UpdateConnectionRequest
        requestBody = {
          connection_id: editingId, // 确保这里使用 editingId 作为 connection_id
          base_config: { base_config_enum: baseConfigEnum },
          connection_name: connectionName.trim(),
        };
        invokeCommand = "update_base_config";
      } else {
        // 构建 SaveConnectionRequest
        requestBody = {
          base_config: { base_config_enum: baseConfigEnum },
          connection_name: connectionName.trim(),
        };
        invokeCommand = "save_base_config";
      }

      console.log(
        `正在${isEditMode ? "更新" : "创建"}连接, 请求体:`,
        JSON.stringify(requestBody)
      );

      // 根据模式调用不同的后端接口
      responseJson = await invoke(invokeCommand, {
        saveConnectionRequest: requestBody,
      });
      // END_OF_MODIFICATION

      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        // 将 alert 替换为 toast.success
        toast.success(isEditMode ? "连接更新成功！" : "连接创建成功！");

        // START_OF_MODIFICATION
        // 在成功后，获取被影响的连接ID，并传递给 onSaveSuccess 回调
        let affectedId = null;
        if (isEditMode) {
          affectedId = editingId; // 编辑模式下，ID就是传入的 editingId
        } else {
          // 新建模式下，假设后端返回的 response_msg 中包含 base_config_id
          // 需要处理 response_msg 可能是字符串化 JSON 的情况
          const parsedMsg =
            typeof response_msg === "string"
              ? JSON.parse(response_msg)
              : response_msg;
          if (
            parsedMsg &&
            typeof parsedMsg === "object" &&
            parsedMsg.base_config_id
          ) {
            affectedId = parsedMsg.base_config_id;
          }
        }
        if (onSaveSuccess) {
          onSaveSuccess(affectedId, isEditMode); // 调用父组件的回调，告知连接已保存
        }
        // END_OF_MODIFICATION

        onClose();
      } else {
        setError(`${isEditMode ? "更新" : "创建"}失败: ${response_msg}`);
      }
    } catch (err) {
      setError(`${isEditMode ? "更新" : "创建"}时发生错误: ${err.toString()}`);
      console.error(`${isEditMode ? "更新" : "创建"}连接异常:`, err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestConnection = async () => {
    setError("");
    setTestResult(null);
    setTestMessage("");
    setIsTesting(true);

    let testDatabaseRequest = null;
    try {
      if (dbType === "sqlite") {
        if (!connectionString.trim()) throw new Error("请选择一个数据库文件！");
        testDatabaseRequest = {
          base_config_enum: {
            sqlite: { file_path: connectionString.trim() },
          },
        };
      } else {
        let connectionDetailsForBackend;
        if (connectionMode === "url") {
          if (!connectionString.trim())
            throw new Error("连接字符串不能为空，无法测试！");
          if (dbType === "mysql")
            connectionDetailsForBackend = parseMysqlUrl(connectionString);
          else if (dbType === "oracle")
            connectionDetailsForBackend = parseOracleUrl(connectionString);
          else
            throw new Error(
              `URL模式暂不支持 ${dbType} 类型数据库的后端解析测试。`
            );
        } else {
          const { isValid, message, details } = getHostConnectionDetails();
          if (!isValid) throw new Error(message);
          connectionDetailsForBackend = details;
        }

        if (connectionDetailsForBackend) {
          testDatabaseRequest = {
            base_config_enum: {
              [dbType]: { config: connectionDetailsForBackend },
            },
          };
        }
      }

      if (!testDatabaseRequest) {
        throw new Error("无法构建有效的连接配置用于测试。");
      }

      const datass = await invoke("test_url", { testDatabaseRequest });
      const { response_code, response_msg } = JSON.parse(datass);

      if (response_code === 0) {
        setTestResult("success");
        setTestMessage("连接测试成功！");
      } else {
        setTestResult("failure");
        setTestMessage(`连接测试失败: ${response_msg}`);
      }
    } catch (err) {
      setTestResult("failure");
      const errorMessage = `连接测试异常: ${err.toString()}`;
      setTestMessage(errorMessage);
      setError(errorMessage);
      console.error("连接测试异常:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const getUrlPlaceholder = () => {
    switch (dbType) {
      case "mysql":
        return "例如: mysql://user:password@host:port/database_name";
      case "oracle":
        return "例如: oracle://user:password@host:port/service_name";
      default:
        return "请输入连接字符串";
    }
  };

  const canUseHostMode = traditionalDbTypes.includes(dbType);

  return (
    <dialog id="new_connection_modal" className="modal" open={isOpen}>
      <div className="modal-box max-w-lg bg-base-100 shadow-xl rounded-lg p-6">
        <h3 className="font-bold text-2xl text-primary mb-4 border-b border-base-content/20 pb-2">
          {isEditMode ? "编辑数据库连接" : "新建数据库连接"}
        </h3>

        <form onSubmit={handleCreate}>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">
                  连接名称 <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="请输入连接名称"
                className={`input input-bordered w-full ${
                  error && error.includes("名称") ? "input-error" : ""
                }`}
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">数据库类型</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={dbType}
                onChange={(e) => {
                  const newDbType = e.target.value;
                  setDbType(newDbType);
                  // Only reset name if not in edit mode, or if dbType changes
                  if (!isEditMode || newDbType !== dbType) {
                    setConnectionName(
                      `${newDbType}-${generateRandomString(4)}`
                    );
                  }
                }}
                disabled={isEditMode} // Usually, dbType cannot be changed in edit mode
              >
                <option value="sqlite">SQLite</option>
                <option value="mysql">MySQL</option>
                <option value="oracle">Oracle</option>
              </select>
            </div>

            {canUseHostMode && (
              <div role="tablist" className="tabs tabs-boxed w-fit">
                <a
                  role="tab"
                  className={`tab ${
                    connectionMode === "url" ? "tab-active" : ""
                  }`}
                  onClick={() => setConnectionMode("url")}
                >
                  URL模式
                </a>
                <a
                  role="tab"
                  className={`tab ${
                    connectionMode === "host" ? "tab-active" : ""
                  }`}
                  onClick={() => setConnectionMode("host")}
                >
                  Host模式
                </a>
              </div>
            )}

            {connectionMode === "url" && (
              <div className="form-control">
                {dbType === "sqlite" ? (
                  <>
                    <label className="label">
                      <span className="label-text text-lg">
                        数据库文件 <span className="text-error">*</span>
                      </span>
                    </label>
                    <div className="join w-full">
                      <input
                        type="text"
                        placeholder="点击右侧按钮选择文件"
                        className={`input input-bordered join-item w-full ${
                          error && error.includes("路径") ? "input-error" : ""
                        }`}
                        value={connectionString}
                        readOnly
                      />
                      <button
                        type="button"
                        className="btn btn-primary join-item"
                        onClick={handleSelectSqliteFile}
                      >
                        选择文件
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="label">
                      <span className="label-text text-lg">
                        连接字符串 <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder={getUrlPlaceholder()}
                      className={`input input-bordered w-full ${
                        error && error.includes("字符串") ? "input-error" : ""
                      }`}
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                    />
                  </>
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
                    onChange={(e) => setHost(e.target.value)}
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
                    placeholder={dbType === "mysql" ? "3306" : "1521"}
                    className={`input input-bordered w-full ${
                      error && error.includes("端口") ? "input-error" : ""
                    }`}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
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
                    onChange={(e) => setUsername(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
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
                    onChange={(e) => setDatabaseName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error shadow-lg mt-4">
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
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

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
              disabled={isTesting || isCreating || !isFormValid()}
            >
              {isTesting ? "测试中..." : "测试连接"}
            </button>

            <button
              type="submit"
              className={`btn btn-primary ${isCreating ? "loading" : ""}`}
              disabled={isTesting || isCreating || !isFormValid()}
            >
              {isCreating
                ? isEditMode
                  ? "更新中..."
                  : "创建中..."
                : isEditMode
                ? "更新"
                : "创建"}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isCreating}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export default NewConnectionModal;
