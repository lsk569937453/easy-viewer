import { BACKEND_COMMANDS, callBackend } from "./invoke";

/** Redis 控制台 / key 详情统一出口。 */
export const executeRedisCommand = (
  connectionId: number,
  command: string,
): Promise<string> =>
  callBackend<string>(BACKEND_COMMANDS.redisExecuteCommand, {
    connectionId,
    command,
  });
