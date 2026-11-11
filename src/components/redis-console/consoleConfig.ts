import type { RedisCommandResponse } from "../../types/backend";

/** 控制台历史条目。 */
export interface ConsoleEntry {
  command: string;
  response?: RedisCommandResponse;
  error?: string;
  timestamp: string;
  duration: number;
}

/** 需要二次确认的危险命令 */
export const DANGEROUS_COMMANDS = ["FLUSHALL", "FLUSHDB", "SHUTDOWN"];

export const COMMON_COMMANDS = [
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

/** 取命令首词（大写），用于危险命令判定与展示。 */
export const commandHead = (command: string): string =>
  command.toUpperCase().split(/\s+/)[0];

/** 是否是需要二次确认的危险命令（忽略大小写，允许带参数）。 */
export const isDangerousCommand = (command: string): boolean =>
  DANGEROUS_COMMANDS.includes(commandHead(command));
