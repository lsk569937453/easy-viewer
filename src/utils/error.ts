/** 统一把 unknown 异常转成展示文案，保持原 `err.message || err.toString()` 的输出。 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.toString();
  }
  return String(error);
}
