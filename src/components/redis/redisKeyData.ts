import { executeRedisCommand } from "../../api/redis";
import { exeSql } from "../../api/sql";
import type {
  ExeSqlResponse,
  RedisCommandResponse,
  SqlHeader,
} from "../../types/backend";
import type { TreeNodePathSegment } from "../../types/tree";
import { parseBaseResponse } from "../../utils/backendResponse";
import { parseRedisCommandResponse } from "./redisKeyUtils";

/**
 * 执行 Redis 命令，成功返回解析结果，任一环节失败抛出错误。
 * 错误文案与拆分前的内联实现保持一致。
 */
export const runRedisCommand = async (
  connectionId: number,
  command: string,
): Promise<RedisCommandResponse> => {
  const responseJson = await executeRedisCommand(connectionId, command);
  const { response_code, response_msg } =
    parseBaseResponse<RedisCommandResponse>(responseJson);

  if (response_code !== 0) {
    throw new Error(response_msg || "命令执行失败");
  }

  const parsed = response_msg;

  if (parsed.response_type === "error") {
    throw new Error(parsed.value || "Redis 返回错误");
  }

  return parsed;
};

/** 键详情四路并发读取的结果；字段缺省表示该路失败，调用方保留原状态。 */
export interface RedisKeySnapshot {
  headers?: SqlHeader[];
  rows?: (string | null)[][];
  error?: string;
  keyType?: string;
  ttl?: number;
  memoryUsage?: number | null;
}

export interface FetchRedisKeyParams {
  connectionId: number;
  keyName: string;
  path: TreeNodePathSegment[];
  pageSize: number;
}

export const fetchRedisKeySnapshot = async ({
  connectionId,
  keyName,
  path,
  pageSize,
}: FetchRedisKeyParams): Promise<RedisKeySnapshot> => {
  const snapshot: RedisKeySnapshot = {};

  const [valueResult, typeResult, ttlResult, memoryResult] =
    await Promise.allSettled([
      // 值内容通过 exe_sql 读取
      exeSql(`SELECT * FROM ${keyName} LIMIT ${pageSize}`, {
        level_infos: path,
      }),
      // 键类型
      executeRedisCommand(connectionId, `TYPE "${keyName}"`),
      // 剩余过期时间
      executeRedisCommand(connectionId, `TTL "${keyName}"`),
      // 内存占用
      executeRedisCommand(connectionId, `MEMORY USAGE "${keyName}"`),
    ]);

  // 值内容
  if (valueResult.status === "fulfilled") {
    const { response_code, response_msg } = parseBaseResponse<ExeSqlResponse>(
      valueResult.value,
    );
    if (response_code === 0) {
      snapshot.headers = response_msg.header;
      snapshot.rows = response_msg.rows;
    } else {
      snapshot.error = response_msg || "读取键值内容失败";
    }
  } else {
    snapshot.error = "读取键值内容失败";
  }

  // 键类型
  if (typeResult.status === "fulfilled") {
    const parsed = parseRedisCommandResponse(typeResult.value);
    if (parsed?.value) snapshot.keyType = parsed.value;
  }

  // 过期时间
  if (ttlResult.status === "fulfilled") {
    const parsed = parseRedisCommandResponse(ttlResult.value);
    if (parsed) snapshot.ttl = Number(parsed.value);
  }

  // 内存占用
  if (memoryResult.status === "fulfilled") {
    const parsed = parseRedisCommandResponse(memoryResult.value);
    if (parsed?.value && parsed.value !== "(nil)") {
      snapshot.memoryUsage = Number(parsed.value);
    } else {
      snapshot.memoryUsage = null;
    }
  }

  return snapshot;
};

/** DEL：返回是否真的删除了键。 */
export const deleteRedisKey = async (
  connectionId: number,
  keyName: string,
): Promise<boolean> => {
  const parsed = await runRedisCommand(connectionId, `DEL "${keyName}"`);
  return parsed.response_type === "integer" && Number(parsed.value) > 0;
};

/** PERSIST：移除过期时间。 */
export const persistRedisKey = (
  connectionId: number,
  keyName: string,
): Promise<RedisCommandResponse> =>
  runRedisCommand(connectionId, `PERSIST "${keyName}"`);

/** EXPIRE：返回是否设置成功（键仍存在）。 */
export const expireRedisKey = async (
  connectionId: number,
  keyName: string,
  seconds: number,
): Promise<boolean> => {
  const parsed = await runRedisCommand(
    connectionId,
    `EXPIRE "${keyName}" ${seconds}`,
  );
  return parsed.response_type === "integer" && Number(parsed.value) === 1;
};
