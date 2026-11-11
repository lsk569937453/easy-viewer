import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { type FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast"; // 导入 toast
import {
  BACKEND_TO_UI_DB_TYPE,
  type BaseConfig,
  type BaseConfigEnum,
  type DatabaseHostStruct,
  type GetBaseConnectionByIdResponse,
  isBackendDbType,
  isUiDbType,
  type RocketmqConfig,
  type S3Struct,
  type SaveConnectionRequest,
  UI_TO_BACKEND_DB_TYPE,
  type UiDbType,
  type UpdateConnectionRequest,
  type WebdavStruct,
} from "../types/backend";
import {
  parseBaseResponse,
  parseConnectionConfig,
} from "../utils/backendResponse";
import { getErrorMessage } from "../utils/error";

const generateRandomString = (length: number): string => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

type ConnectionMode = "url" | "host";
type TestResult = "success" | "failure" | null;

type ValidationResult<T> =
  | { isValid: true; details: T }
  | { isValid: false; message: string };

type HostValidation = ValidationResult<DatabaseHostStruct>;
type KafkaValidation =
  | { isValid: true; broker: string }
  | { isValid: false; message: string };
type S3Validation = ValidationResult<S3Struct>;
type WebdavValidation = ValidationResult<WebdavStruct>;
type RocketmqValidation = ValidationResult<RocketmqConfig>;

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (affectedId: number | null, isEditMode: boolean) => void;
  editingId?: number | null;
}

// START_OF_MODIFICATION
// 将 onCreationSuccess prop 重命名为 onSaveSuccess，使其更通用
function NewConnectionModal({
  isOpen,
  onClose,
  onSaveSuccess,
  editingId,
}: NewConnectionModalProps) {
  // END_OF_MODIFICATION
  const [connectionName, setConnectionName] = useState("");
  const [dbType, setDbType] = useState<UiDbType>("sqlite");
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("url");
  const [connectionString, setConnectionString] = useState("");

  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [rmqTopics, setRmqTopics] = useState("");
  const [useTls, setUseTls] = useState(true);

  const [error, setError] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [testMessage, setTestMessage] = useState("");
  const isEditMode = !!editingId;

  const traditionalDbTypes: readonly UiDbType[] = [
    "mysql",
    "oracle",
    "postgresql",
    "mongodb",
    "redis",
    "clickhouse",
    "elasticsearch",
  ];
  // Kafka 只需要 broker，用简化表单
  const simpleBrokerTypes: readonly UiDbType[] = ["kafka"];

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
    setRmqTopics("");
    setUseTls(true);
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
            const jsonResponse = await invoke<string>("get_base_config_by_id", {
              baseConfigId: editingId,
            });
            const { response_code, response_msg } =
              parseBaseResponse<GetBaseConnectionByIdResponse>(jsonResponse);

            if (response_code === 0) {
              // --- START: MODIFIED PARSING LOGIC ---

              // 1. The main connection details are in a string field `connection_json`.
              //    We need to parse this string to get the configuration object.
              const connectionConfig = parseConnectionConfig(
                response_msg.connection_json,
              );
              const baseConfigEnum = connectionConfig.base_config_enum;

              // 2. Set the connection name from the top-level field.
              setConnectionName(response_msg.connection_name);

              // 3. Determine the database type from the key of `base_config_enum`.
              const dbTypeKey =
                Object.keys(baseConfigEnum).find(isBackendDbType);
              if (!dbTypeKey) {
                setError("获取连接信息失败: 无法识别的连接类型");
                return;
              }
              // UI 使用 oracle，后端 serde tag 为 oracledb
              setDbType(BACKEND_TO_UI_DB_TYPE[dbTypeKey]);

              // 4. Populate form fields based on the database type.
              if (dbTypeKey === "sqlite") {
                setConnectionMode("url");
                setConnectionString(baseConfigEnum.sqlite?.file_path ?? "");
                setHost("");
                setPort("");
                setUsername("");
                setPassword("");
                setDatabaseName("");
              } else if (dbTypeKey === "kafka") {
                // Kafka: 解析 broker 地址 "host:port"
                const broker = baseConfigEnum.kafka?.broker ?? "";
                const parts = broker.split(":");
                setHost(parts[0] || "");
                setPort(parts[1] || "9092");
                setConnectionMode("host");
                setConnectionString("");
                setUsername("");
                setPassword("");
                setDatabaseName("");
              } else if (dbTypeKey === "s3") {
                // S3 / OSS: access_key / secret_key / region
                const config = baseConfigEnum.s3?.config;
                setHost(config?.host || "");
                setPort(config?.port ? String(config.port) : "443");
                setUsername(config?.access_key || "");
                setPassword(config?.secret_key || "");
                setDatabaseName(config?.region || "");
                setConnectionMode("host");
                setConnectionString("");
              } else if (dbTypeKey === "webdav") {
                // WebDAV: host / port / username / password / root_path / use_tls
                const config = baseConfigEnum.webdav?.config;
                setHost(config?.host || "");
                setPort(config?.port ? String(config.port) : "443");
                setUsername(config?.username || "");
                setPassword(config?.password || "");
                setDatabaseName(config?.root_path || "");
                setUseTls(config?.use_tls !== false);
                setConnectionMode("host");
                setConnectionString("");
              } else if (dbTypeKey === "rocketmq") {
                // RocketMQ: proxy_url, access_key, secret_key, topics
                const config = baseConfigEnum.rocketmq;
                const proxyUrl = config?.proxy_url || "";
                const parts = proxyUrl.split(":");
                setHost(parts[0] || "");
                setPort(parts[1] || "8081");
                setUsername(config?.access_key || "");
                setPassword(config?.secret_key || "");
                setRmqTopics((config?.topics || []).join(", "));
                setConnectionMode("host");
                setConnectionString("");
                setDatabaseName("");
              } else {
                // This handles 'mysql', 'oracle', etc.
                const entry = baseConfigEnum[dbTypeKey];
                if (entry && "config" in entry && "user_name" in entry.config) {
                  const config = entry.config;
                  setHost(config.host || "");
                  setPort(config.port ? String(config.port) : ""); // Ensure port is a string for the input field
                  setUsername(config.user_name || "");
                  setPassword(config.password || ""); // Note: Password might not be sent back for security
                  setDatabaseName(config.database || "");
                }

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
            setError(`获取连接信息时出错: ${getErrorMessage(err)}`);
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
      setUseTls(true);
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

  const parseMysqlUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^mysql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 MySQL URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 3306,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parseOracleUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^oracle:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 Oracle URL 格式。");
    const [, user, pass, host, port, serviceName] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 1521,
      database: serviceName || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parsePostgresqlUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^postgresql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 PostgreSQL URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 5432,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parseMongodbUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^mongodb:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 MongoDB URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 27017,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parseRedisUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^redis:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/(\d+))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 Redis URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 6379,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parseClickhouseUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^clickhouse:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 ClickHouse URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 8123,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const parseElasticsearchUrl = (url: string): DatabaseHostStruct => {
    const regex =
      /^https?:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:]+)(?::(\d+))(?:\/([^?]*))?$/;
    const match = url.match(regex);
    if (!match) throw new Error("无效的 Elasticsearch URL 格式。");
    const [, user, pass, host, port, database] = match;
    return {
      host: host || "",
      port: parseInt(port ?? "", 10) || 9200,
      database: database || "",
      user_name: user || "",
      password: pass || "",
    };
  };

  const getHostConnectionDetails = (): HostValidation => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanDatabaseName = databaseName.trim();
    if (!cleanHost) return { isValid: false, message: "主机不能为空！" };
    const parsedPort = parseInt(cleanPort, 10);
    if (Number.isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      return { isValid: false, message: "端口必须是有效的数字 (1-65535)！" };
    }
    // Redis and Elasticsearch typically don't require a username
    const usernameOptionalTypes = ["redis", "elasticsearch"];
    if (!usernameOptionalTypes.includes(dbType) && !cleanUsername) {
      return { isValid: false, message: "用户名不能为空！" };
    }
    return {
      isValid: true,
      details: {
        host: cleanHost,
        port: parsedPort,
        user_name: cleanUsername,
        password: cleanPassword,
        database: cleanDatabaseName || (dbType === "redis" ? "0" : ""),
      },
    };
  };

  const getKafkaBrokerDetails = (): KafkaValidation => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    if (!cleanHost) return { isValid: false, message: "主机不能为空！" };
    const parsedPort = parseInt(cleanPort, 10) || 9092;
    return {
      isValid: true,
      broker: `${cleanHost}:${parsedPort}`,
    };
  };

  const getS3ConnectionDetails = (): S3Validation => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    const cleanAccessKey = username.trim();
    const cleanSecretKey = password.trim();
    const cleanRegion = databaseName.trim();
    if (!cleanHost) return { isValid: false, message: "Endpoint 不能为空！" };
    if (!cleanAccessKey)
      return { isValid: false, message: "Access Key 不能为空！" };
    if (!cleanSecretKey)
      return { isValid: false, message: "Secret Key 不能为空！" };
    const parsedPort = parseInt(cleanPort, 10) || 443;
    return {
      isValid: true,
      details: {
        host: cleanHost,
        port: parsedPort,
        access_key: cleanAccessKey,
        secret_key: cleanSecretKey,
        region: cleanRegion || "us-east-1",
      },
    };
  };

  const getWebdavConnectionDetails = (): WebdavValidation => {
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    if (!cleanHost) return { isValid: false, message: "服务器地址不能为空！" };
    const parsedPort = parseInt(cleanPort, 10) || 443;
    if (Number.isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      return { isValid: false, message: "端口必须是有效的数字 (1-65535)！" };
    }
    let cleanRootPath = databaseName.trim();
    if (cleanRootPath && !cleanRootPath.startsWith("/")) {
      cleanRootPath = `/${cleanRootPath}`;
    }
    return {
      isValid: true,
      details: {
        host: cleanHost,
        port: parsedPort,
        username: username.trim(),
        password: password.trim(),
        root_path: cleanRootPath || "/",
        use_tls: useTls,
      },
    };
  };

  const getRocketmqConnectionDetails = (): RocketmqValidation => {
    const cleanHost = host.trim();
    if (!cleanHost) return { isValid: false, message: "Proxy 地址不能为空！" };
    const parsedPort = parseInt(port.trim(), 10) || 8081;
    const proxyUrl = `${cleanHost}:${parsedPort}`;
    const topicsList = rmqTopics
      .trim()
      .split(/[,\n]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return {
      isValid: true,
      details: {
        proxy_url: proxyUrl,
        access_key: username.trim() || undefined,
        secret_key: password.trim() || undefined,
        topics: topicsList,
      },
    };
  };

  const isFormValid = () => {
    if (connectionName.trim() === "") return false;
    if (isS3Type) {
      return getS3ConnectionDetails().isValid;
    }
    if (isWebdavType) {
      return getWebdavConnectionDetails().isValid;
    }
    if (isRocketmqType) {
      return getRocketmqConnectionDetails().isValid;
    }
    if (simpleBrokerTypes.includes(dbType)) {
      return getKafkaBrokerDetails().isValid;
    }
    if (connectionMode === "url") {
      return connectionString.trim() !== "";
    } else {
      return getHostConnectionDetails().isValid;
    }
  };

  // 处理创建/更新连接的逻辑
  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
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
      let baseConfigEnum: BaseConfigEnum | null = null;

      if (dbType === "sqlite") {
        baseConfigEnum = {
          sqlite: {
            file_path: connectionString.trim(),
          },
        };
      } else if (isS3Type) {
        // S3 / OSS
        const result = getS3ConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        baseConfigEnum = { s3: { config: result.details } };
      } else if (isWebdavType) {
        // WebDAV
        const result = getWebdavConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        baseConfigEnum = { webdav: { config: result.details } };
      } else if (isRocketmqType) {
        // RocketMQ
        const result = getRocketmqConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        baseConfigEnum = { rocketmq: result.details };
      } else if (simpleBrokerTypes.includes(dbType)) {
        // Kafka 等只需要 broker 的类型
        const result = getKafkaBrokerDetails();
        if (!result.isValid) throw new Error(result.message);
        baseConfigEnum = {
          [UI_TO_BACKEND_DB_TYPE[dbType]]: { broker: result.broker },
        };
      } else if (connectionMode === "url") {
        let details: DatabaseHostStruct;
        if (dbType === "mysql") {
          details = parseMysqlUrl(connectionString.trim());
        } else if (dbType === "oracle") {
          details = parseOracleUrl(connectionString.trim());
        } else if (dbType === "postgresql") {
          details = parsePostgresqlUrl(connectionString.trim());
        } else if (dbType === "mongodb") {
          details = parseMongodbUrl(connectionString.trim());
        } else if (dbType === "redis") {
          details = parseRedisUrl(connectionString.trim());
        } else if (dbType === "clickhouse") {
          details = parseClickhouseUrl(connectionString.trim());
        } else if (dbType === "elasticsearch") {
          details = parseElasticsearchUrl(connectionString.trim());
        } else {
          throw new Error(`不支持的数据库类型: ${dbType}`);
        }
        baseConfigEnum = {
          [UI_TO_BACKEND_DB_TYPE[dbType]]: { config: details },
        };
      } else {
        // Host 模式
        const result = getHostConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        baseConfigEnum = {
          [UI_TO_BACKEND_DB_TYPE[dbType]]: { config: result.details },
        };
      }

      if (!baseConfigEnum) {
        throw new Error("无法构建连接配置。");
      }

      // START_OF_MODIFICATION
      const invokeCommand: "save_base_config" | "update_base_config" =
        isEditMode ? "update_base_config" : "save_base_config";
      const requestBody: SaveConnectionRequest | UpdateConnectionRequest =
        isEditMode
          ? {
              connection_id: editingId ?? 0, // 编辑模式下 editingId 一定存在
              base_config: { base_config_enum: baseConfigEnum },
              connection_name: connectionName.trim(),
            }
          : {
              base_config: { base_config_enum: baseConfigEnum },
              connection_name: connectionName.trim(),
            };

      // 根据模式调用不同的后端接口
      const responseJson = await invoke<string>(invokeCommand, {
        saveConnectionRequest: requestBody,
      });
      // END_OF_MODIFICATION

      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        // 将 alert 替换为 toast.success
        toast.success(isEditMode ? "连接更新成功！" : "连接创建成功！");

        // START_OF_MODIFICATION
        // 新建时后端 save_base_config 返回 ()，因此没有可复用的 id；
        // 编辑时使用传入的 editingId。父组件会据此刷新连接列表。
        const affectedId: number | null = isEditMode
          ? (editingId ?? null)
          : null;
        onSaveSuccess?.(affectedId, isEditMode); // 调用父组件的回调，告知连接已保存
        // END_OF_MODIFICATION

        onClose();
      } else {
        setError(`${isEditMode ? "更新" : "创建"}失败: ${response_msg}`);
      }
    } catch (err) {
      setError(
        `${isEditMode ? "更新" : "创建"}时发生错误: ${getErrorMessage(err)}`,
      );
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

    let testDatabaseRequest: BaseConfig | null = null;
    try {
      if (dbType === "sqlite") {
        if (!connectionString.trim()) throw new Error("请选择一个数据库文件！");
        testDatabaseRequest = {
          base_config_enum: {
            sqlite: { file_path: connectionString.trim() },
          },
        };
      } else if (isS3Type) {
        const result = getS3ConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        testDatabaseRequest = {
          base_config_enum: {
            s3: { config: result.details },
          },
        };
      } else if (isWebdavType) {
        const result = getWebdavConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        testDatabaseRequest = {
          base_config_enum: {
            webdav: { config: result.details },
          },
        };
      } else if (isRocketmqType) {
        const result = getRocketmqConnectionDetails();
        if (!result.isValid) throw new Error(result.message);
        testDatabaseRequest = {
          base_config_enum: {
            rocketmq: result.details,
          },
        };
      } else if (simpleBrokerTypes.includes(dbType)) {
        const result = getKafkaBrokerDetails();
        if (!result.isValid) throw new Error(result.message);
        testDatabaseRequest = {
          base_config_enum: {
            [UI_TO_BACKEND_DB_TYPE[dbType]]: { broker: result.broker },
          },
        };
      } else {
        let connectionDetailsForBackend: DatabaseHostStruct;
        if (connectionMode === "url") {
          if (!connectionString.trim())
            throw new Error("连接字符串不能为空，无法测试！");
          if (dbType === "mysql")
            connectionDetailsForBackend = parseMysqlUrl(connectionString);
          else if (dbType === "oracle")
            connectionDetailsForBackend = parseOracleUrl(connectionString);
          else if (dbType === "postgresql")
            connectionDetailsForBackend = parsePostgresqlUrl(connectionString);
          else if (dbType === "mongodb")
            connectionDetailsForBackend = parseMongodbUrl(connectionString);
          else if (dbType === "redis")
            connectionDetailsForBackend = parseRedisUrl(connectionString);
          else if (dbType === "clickhouse")
            connectionDetailsForBackend = parseClickhouseUrl(connectionString);
          else if (dbType === "elasticsearch")
            connectionDetailsForBackend =
              parseElasticsearchUrl(connectionString);
          else
            throw new Error(
              `URL模式暂不支持 ${dbType} 类型数据库的后端解析测试。`,
            );
        } else {
          const result = getHostConnectionDetails();
          if (!result.isValid) throw new Error(result.message);
          connectionDetailsForBackend = result.details;
        }

        testDatabaseRequest = {
          base_config_enum: {
            [UI_TO_BACKEND_DB_TYPE[dbType]]: {
              config: connectionDetailsForBackend,
            },
          },
        };
      }

      if (!testDatabaseRequest) {
        throw new Error("无法构建有效的连接配置用于测试。");
      }

      const datass = await invoke<string>("test_url", { testDatabaseRequest });
      const { response_code, response_msg } = parseBaseResponse<null>(datass);

      if (response_code === 0) {
        setTestResult("success");
        setTestMessage("连接测试成功！");
      } else {
        setTestResult("failure");
        setTestMessage(`连接测试失败: ${response_msg}`);
      }
    } catch (err) {
      setTestResult("failure");
      const errorMessage = `连接测试异常: ${getErrorMessage(err)}`;
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
      case "postgresql":
        return "例如: postgresql://user:password@host:port/database_name";
      case "mongodb":
        return "例如: mongodb://user:password@host:port/database_name";
      case "redis":
        return "例如: redis://password@host:port/db_index";
      case "clickhouse":
        return "例如: clickhouse://user:password@host:port/database";
      case "elasticsearch":
        return "例如: http://user:password@host:port";
      case "kafka":
        return "例如: kafka://host:port";
      default:
        return "请输入连接字符串";
    }
  };

  const canUseHostMode = traditionalDbTypes.includes(dbType);
  const isKafkaType = dbType === "kafka";
  const isRocketmqType = dbType === "rocketmq";
  const isS3Type = dbType === "s3";
  const isWebdavType = dbType === "webdav";

  return (
    <dialog id="new_connection_modal" className="modal" open={isOpen}>
      <div className="modal-box max-w-lg bg-base-100 shadow-xl rounded-lg p-6">
        <h2
          id="new-connection-title"
          className="font-bold text-2xl text-primary mb-4 border-b border-base-content/20 pb-2"
        >
          {isEditMode ? "编辑数据库连接" : "新建数据库连接"}
        </h2>

        <form onSubmit={handleCreate}>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="conn-name">
                <span className="label-text text-lg">
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
                className={`input input-bordered w-full ${
                  error?.includes("名称") ? "input-error" : ""
                }`}
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="conn-type">
                <span className="label-text text-lg">数据库类型</span>
              </label>
              <select
                id="conn-type"
                name="dbType"
                className="select select-bordered w-full"
                value={dbType}
                onChange={(e) => {
                  const newDbType = e.target.value;
                  if (!isUiDbType(newDbType)) return;
                  setDbType(newDbType);
                  // Only reset name if not in edit mode, or if dbType changes
                  if (!isEditMode || newDbType !== dbType) {
                    setConnectionName(
                      `${newDbType}-${generateRandomString(4)}`,
                    );
                  }
                }}
                disabled={isEditMode} // Usually, dbType cannot be changed in edit mode
              >
                <option value="sqlite">SQLite</option>
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="oracle">Oracle</option>
                <option value="mongodb">MongoDB</option>
                <option value="redis">Redis</option>
                <option value="clickhouse">ClickHouse</option>
                <option value="elasticsearch">Elasticsearch</option>
                <option value="s3">S3 / OSS</option>
                <option value="webdav">WebDAV</option>
                <option value="kafka">Kafka</option>
                <option value="rocketmq">RocketMQ</option>
              </select>
            </div>

            {canUseHostMode && (
              <div
                role="tablist"
                aria-label="连接方式"
                className="tabs tabs-boxed w-fit"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={connectionMode === "url"}
                  className={`tab ${
                    connectionMode === "url" ? "tab-active" : ""
                  }`}
                  onClick={() => setConnectionMode("url")}
                >
                  URL 模式
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={connectionMode === "host"}
                  className={`tab ${
                    connectionMode === "host" ? "tab-active" : ""
                  }`}
                  onClick={() => setConnectionMode("host")}
                >
                  Host 模式
                </button>
              </div>
            )}

            {connectionMode === "url" && (
              <div className="form-control">
                {dbType === "sqlite" ? (
                  <>
                    <label className="label" htmlFor="conn-sqlite-file">
                      <span className="label-text text-lg">
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
                        className={`input input-bordered join-item w-full ${
                          error?.includes("路径") ? "input-error" : ""
                        }`}
                        value={connectionString}
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
                    <label className="label" htmlFor="conn-url">
                      <span className="label-text text-lg">
                        连接字符串 <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      id="conn-url"
                      name="connectionString"
                      type="text"
                      placeholder={getUrlPlaceholder()}
                      autoComplete="off"
                      spellCheck={false}
                      className={`input input-bordered w-full ${
                        error?.includes("字符串") ? "input-error" : ""
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
                  <label className="label" htmlFor="conn-host">
                    <span className="label-text">
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
                    className={`input input-bordered w-full ${
                      error?.includes("主机") ? "input-error" : ""
                    }`}
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="conn-port">
                    <span className="label-text">
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
                      dbType === "mysql"
                        ? "3306"
                        : dbType === "postgresql"
                          ? "5432"
                          : dbType === "mongodb"
                            ? "27017"
                            : dbType === "redis"
                              ? "6379"
                              : dbType === "clickhouse"
                                ? "8123"
                                : dbType === "elasticsearch"
                                  ? "9200"
                                  : "1521"
                    }
                    className={`input input-bordered w-full ${
                      error?.includes("端口") ? "input-error" : ""
                    }`}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="conn-username">
                    <span className="label-text">
                      用户名{" "}
                      {dbType !== "redis" && dbType !== "elasticsearch" && (
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
                    className={`input input-bordered w-full ${
                      error?.includes("用户名") ? "input-error" : ""
                    }`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="conn-password">
                    <span className="label-text">密码</span>
                  </label>
                  <input
                    id="conn-password"
                    name="password"
                    type="password"
                    placeholder="请输入密码…"
                    autoComplete="off"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="conn-dbname">
                    <span className="label-text">
                      {dbType === "oracle"
                        ? "服务名/SID (可选)"
                        : dbType === "postgresql"
                          ? "数据库名"
                          : dbType === "redis"
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
                      dbType === "oracle"
                        ? "例如: ORCL 或 xe"
                        : dbType === "redis"
                          ? "例如: 0"
                          : "例如: mydatabase"
                    }
                    className="input input-bordered w-full"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isKafkaType && (
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label" htmlFor="kafka-host">
                    <span className="label-text">
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
                      className={`input input-bordered flex-1 ${
                        error?.includes("主机") ? "input-error" : ""
                      }`}
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                    <input
                      id="kafka-port"
                      name="port"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="端口"
                      placeholder="9092"
                      className={`input input-bordered w-24 ${
                        error?.includes("端口") ? "input-error" : ""
                      }`}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {isRocketmqType && (
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label" htmlFor="rmq-host">
                    <span className="label-text">
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
                      className={`input input-bordered flex-1 ${
                        error?.includes("主机") ? "input-error" : ""
                      }`}
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                    <input
                      id="rmq-port"
                      name="port"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="端口"
                      placeholder="8081"
                      className={`input input-bordered w-24 ${
                        error?.includes("端口") ? "input-error" : ""
                      }`}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="rmq-access-key">
                    <span className="label-text">Access Key (可选)</span>
                  </label>
                  <input
                    id="rmq-access-key"
                    name="accessKey"
                    type="text"
                    placeholder="例如: your-access-key"
                    autoComplete="off"
                    spellCheck={false}
                    className="input input-bordered w-full"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="rmq-secret-key">
                    <span className="label-text">Secret Key (可选)</span>
                  </label>
                  <input
                    id="rmq-secret-key"
                    name="secretKey"
                    type="password"
                    placeholder="请输入 Secret Key…"
                    autoComplete="off"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="rmq-topics">
                    <span className="label-text">
                      Topics <span className="text-error">*</span>
                    </span>
                  </label>
                  <textarea
                    id="rmq-topics"
                    name="topics"
                    autoComplete="off"
                    spellCheck={false}
                    className="textarea textarea-bordered h-24 font-mono text-sm"
                    placeholder="输入 Topic 名称，逗号或换行分隔&#10;例如: topic1, topic2, topic3"
                    value={rmqTopics}
                    onChange={(e) => setRmqTopics(e.target.value)}
                  />
                  <span className="label-text-alt px-2 pt-1">
                    逗号或换行分隔多个 Topic
                  </span>
                </div>
              </div>
            )}

            {isS3Type && (
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label" htmlFor="s3-endpoint">
                    <span className="label-text">
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
                      className={`input input-bordered flex-1 ${
                        error?.includes("Endpoint") ||
                        error?.includes("主机")
                          ? "input-error"
                          : ""
                      }`}
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                    <input
                      id="s3-port"
                      name="port"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="端口"
                      placeholder="443"
                      className={`input input-bordered w-24 ${
                        error?.includes("端口") ? "input-error" : ""
                      }`}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="s3-access-key">
                    <span className="label-text">
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
                    className={`input input-bordered w-full ${
                      error?.includes("Access Key") ? "input-error" : ""
                    }`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="s3-secret-key">
                    <span className="label-text">
                      Secret Key <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    id="s3-secret-key"
                    name="secretKey"
                    type="password"
                    placeholder="请输入 Secret Key…"
                    autoComplete="off"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="s3-region">
                    <span className="label-text">
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
                    className="input input-bordered w-full"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isWebdavType && (
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label" htmlFor="dav-host">
                    <span className="label-text">
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
                      className={`input input-bordered flex-1 ${
                        error?.includes("服务器地址") ? "input-error" : ""
                      }`}
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                    <input
                      id="dav-port"
                      name="port"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="端口"
                      placeholder="443"
                      className={`input input-bordered w-24 ${
                        error?.includes("端口") ? "input-error" : ""
                      }`}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="dav-username">
                    <span className="label-text">用户名 (可选)</span>
                  </label>
                  <input
                    id="dav-username"
                    name="username"
                    type="text"
                    placeholder="例如: user@example.com"
                    autoComplete="off"
                    spellCheck={false}
                    className="input input-bordered w-full"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="dav-password">
                    <span className="label-text">密码 (可选)</span>
                  </label>
                  <input
                    id="dav-password"
                    name="password"
                    type="password"
                    placeholder="请输入密码或应用密码…"
                    autoComplete="off"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="dav-root">
                    <span className="label-text">远程目录 (可选，默认 /)</span>
                  </label>
                  <input
                    id="dav-root"
                    name="remotePath"
                    type="text"
                    placeholder="例如: /dav/ 或 /remote.php/dav/files/username"
                    autoComplete="off"
                    spellCheck={false}
                    className="input input-bordered w-full"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label cursor-pointer" htmlFor="dav-use-tls">
                    <span className="label-text">使用 HTTPS (TLS)</span>
                    <input
                      id="dav-use-tls"
                      name="useTls"
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={useTls}
                      onChange={(e) => setUseTls(e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="alert alert-error shadow-lg mt-4">
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
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
                role="status"
                aria-live="polite"
                className={`alert ${
                  testResult === "success" ? "alert-success" : "alert-error"
                } shadow-lg`}
              >
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
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
              disabled={isTesting || isCreating}
            >
              {isTesting ? "测试中…" : "测试连接"}
            </button>

            <button
              type="submit"
              className={`btn btn-primary ${isCreating ? "loading" : ""}`}
              disabled={isTesting || isCreating}
            >
              {isCreating
                ? isEditMode
                  ? "更新中…"
                  : "创建中…"
                : isEditMode
                  ? "更新连接"
                  : "创建连接"}
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
