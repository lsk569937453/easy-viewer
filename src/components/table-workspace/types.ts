/** 表数据行：每行带前端生成的 `id`，其余列按表头动态展开。 */
export type EditableRow = Record<string, string | null> & { id: string };
