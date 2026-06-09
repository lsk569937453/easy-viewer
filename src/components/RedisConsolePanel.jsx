import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  IoTrashOutline,
  IoHelpCircleOutline,
  IoSend,
  IoArrowUp,
  IoArrowDown,
} from "react-icons/io5";
import { FaTerminal } from "react-icons/fa";

function RedisConsolePanel({ activeTabNode, connectionDetails }) {
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const outputEndRef = useRef(null);
  const inputRef = useRef(null);

  const connectionId = connectionDetails?.base_config_id;
  const connectionName = `${connectionDetails?.config?.host || ""}:${connectionDetails?.config?.port || ""}`;

  // 自动滚动到底部
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [commandHistory]);

  // 聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleExecute = async () => {
    const command = currentInput.trim();
    if (!command) return;

    // 危险命令确认
    const dangerousCommands = ["FLUSHALL", "FLUSHDB", "SHUTDOWN"];
    const commandUpper = command.toUpperCase().split(/\s+/)[0];
    if (dangerousCommands.includes(commandUpper)) {
      const confirmed = window.confirm(
        `⚠️ 警告：${commandUpper} 是危险命令，确定要执行吗？`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const responseJson = await invoke("redis_execute_command", {
        connectionId,
        command,
      });

      const response = JSON.parse(responseJson);
      const { response_code, response_msg } = response;

      if (response_code === 0 && response_msg) {
        const parsedResponse = typeof response_msg === 'string'
          ? JSON.parse(response_msg)
          : response_msg;

        setCommandHistory((prev) => [
          ...prev,
          {
            command,
            response: parsedResponse,
            timestamp: new Date().toLocaleTimeString(),
            duration: Date.now() - startTime,
          },
        ]);
        setCurrentInput("");
        setHistoryIndex(-1);
      } else {
        setCommandHistory((prev) => [
          ...prev,
          {
            command,
            error: response_msg || "执行失败",
            timestamp: new Date().toLocaleTimeString(),
            duration: Date.now() - startTime,
          },
        ]);
        setCurrentInput("");
        setHistoryIndex(-1);
      }
    } catch (err) {
      setCommandHistory((prev) => [
        ...prev,
        {
          command,
          error: err.message || err.toString(),
          timestamp: new Date().toLocaleTimeString(),
          duration: Date.now() - startTime,
        },
      ]);
      setCurrentInput("");
      setHistoryIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleExecute();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex].command);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput("");
      }
    }
  };

  const handleClear = () => {
    setCommandHistory([]);
  };

  const formatResponse = (response) => {
    if (!response) return null;

    const { response_type, value, array_items, execution_time_ms } = response;

    const timeBadge = (
      <span className="text-xs opacity-50 ml-2">
        ({execution_time_ms}ms)
      </span>
    );

    switch (response_type) {
      case "nil":
        return (
          <div>
            <span className="text-base-content/40">(nil)</span>
            {timeBadge}
          </div>
        );
      case "integer":
        return (
          <div>
            <span className="text-info">
              (integer) {value}
            </span>
            {timeBadge}
          </div>
        );
      case "string":
        let displayValue = value;
        let isJson = false;
        try {
          JSON.parse(value);
          isJson = true;
        } catch (e) {
          // Not JSON
        }

        if (isJson) {
          try {
            displayValue = JSON.stringify(JSON.parse(value), null, 2);
          } catch (e) {
            // Keep original if formatting fails
          }
        }

        return (
          <div>
            <pre className={`text-success ${isJson ? "bg-base-300/30 p-2 rounded" : ""}`}>
              "{displayValue}"
            </pre>
            {timeBadge}
          </div>
        );
      case "ok":
        return (
          <div>
            <span className="text-warning">OK</span>
            {timeBadge}
          </div>
        );
      case "status":
        return (
          <div>
            <span className="text-warning">{value}</span>
            {timeBadge}
          </div>
        );
      case "array":
        return (
          <div>
            {array_items && array_items.length > 0 ? (
              <div>
                {array_items.map((item, index) => (
                  <div key={index} className="font-mono">
                    <span className="text-base-content/50">{index + 1})</span>{" "}
                    <span>{item}</span>
                  </div>
                ))}
                <span className="text-xs opacity-50">
                  ({array_items.length} elements)
                </span>
                {timeBadge}
              </div>
            ) : (
              <div>
                <span className="text-base-content/40">(empty array)</span>
                {timeBadge}
              </div>
            )}
          </div>
        );
      case "error":
        return (
          <div>
            <span className="text-error">{value}</span>
            {timeBadge}
          </div>
        );
      default:
        return (
          <div>
            <span>{value || "(unknown response type)"}</span>
            {timeBadge}
          </div>
        );
    }
  };

  const commonCommands = [
    { cmd: "PING", desc: "测试连接" },
    { cmd: "SET key value", desc: "设置键值" },
    { cmd: "GET key", desc: "获取键值" },
    { cmd: "DEL key", desc: "删除键" },
    { cmd: "DBSIZE", desc: "获取数据库大小" },
    { cmd: "KEYS pattern", desc: "查找键（如 KEYS *）" },
    { cmd: "HSET key field value", desc: "设置哈希字段" },
    { cmd: "HGETALL key", desc: "获取哈希所有字段" },
    { cmd: "LPUSH key value", desc: "列表左侧推入" },
    { cmd: "LRANGE key 0 -1", desc: "获取列表所有元素" },
    { cmd: "SADD key member", desc: "集合添加成员" },
    { cmd: "SMEMBERS key", desc: "获取集合所有成员" },
    { cmd: "ZADD key score member", desc: "有序集合添加" },
    { cmd: "ZRANGE key 0 -1 WITHSCORES", desc: "获取有序集合" },
    { cmd: "EXISTS key", desc: "检查键是否存在" },
    { cmd: "TTL key", desc: "获取键的过期时间" },
    { cmd: "EXPIRE key seconds", desc: "设置键的过期时间" },
  ];

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-200/30 border-b border-base-content/10">
        <div className="flex items-center gap-2">
          <FaTerminal className="text-primary" />
          <span className="font-semibold text-sm">
            Redis Console - {connectionName}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="btn btn-ghost btn-xs"
            title="清空历史"
          >
            <IoTrashOutline />
            清空
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-ghost btn-xs"
            title="帮助"
          >
            <IoHelpCircleOutline />
            帮助
          </button>
        </div>
      </div>

      {/* 帮助面板 */}
      {showHelp && (
        <div className="bg-base-200/50 border-b border-base-content/10 p-4">
          <h3 className="font-semibold mb-2">常用 Redis 命令</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {commonCommands.map((item, index) => (
              <div key={index} className="flex gap-2">
                <code className="text-primary font-mono">{item.cmd}</code>
                <span className="text-base-content/60">{item.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-base-content/50">
            <p>• 按 Enter 执行命令，↑↓ 浏览历史</p>
            <p>• 支持引号内的空格，如 SET key "hello world"</p>
            <p>• FLUSHALL、FLUSHDB、SHUTDOWN 命令会弹出确认框</p>
          </div>
        </div>
      )}

      {/* 输出区域 */}
      <div className="flex-1 overflow-y-auto p-4 bg-base-300/20 font-mono text-sm">
        {commandHistory.length === 0 ? (
          <div className="text-center text-base-content/30 py-8">
            <FaTerminal size={48} className="mx-auto mb-4" />
            <p>输入 Redis 命令开始使用</p>
            <p className="text-xs mt-2">试试 PING 命令</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commandHistory.map((item, index) => (
              <div
                key={index}
                className="border-l-2 border-base-content/10 pl-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-base-content/50 mb-1">
                  <span>{item.timestamp}</span>
                  <span>•</span>
                  <span>{item.duration}ms</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">&gt;</span>
                  <span className="text-base-content">{item.command}</span>
                </div>
                <div className="ml-4 mt-1">
                  {item.error ? (
                    <div className="text-error">{item.error}</div>
                  ) : (
                    formatResponse(item.response)
                  )}
                </div>
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>
        )}
      </div>

      {/* 输入栏 */}
      <div className="border-t border-base-content/10 bg-base-200/30 p-3">
        <div className="flex gap-2">
          <span className="text-primary font-bold flex items-center">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 Redis 命令..."
            className="flex-1 bg-base-100 border border-base-content/20 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary/50"
            disabled={loading}
          />
          <button
            onClick={handleExecute}
            disabled={loading || !currentInput.trim()}
            className="btn btn-primary btn-sm"
            title="执行 (Enter)"
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <IoSend />
            )}
          </button>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-base-content/40">
          <span>Enter 执行</span>
          <span>↑↓ 历史</span>
          <span>ESC 清空</span>
        </div>
      </div>
    </div>
  );
}

export default RedisConsolePanel;
