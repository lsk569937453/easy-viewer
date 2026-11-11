export interface MessageFilterOptions {
  searchTerm: string;
  partitionFilter: string;
  supportsPartitionFilter: boolean;
}

/**
 * 消息行的本地过滤：先按分区（第 0 列）过滤，再对整行拼成的文本做
 * 大小写不敏感搜索。语义与拆分前的内联 filter 完全一致。
 */
export const filterMessages = (
  rows: (string | null)[][],
  {
    searchTerm,
    partitionFilter,
    supportsPartitionFilter,
  }: MessageFilterOptions,
): (string | null)[][] =>
  rows.filter((row) => {
    if (supportsPartitionFilter && partitionFilter !== "all") {
      if (row[0] !== partitionFilter) return false;
    }
    if (searchTerm) {
      const searchableText = row
        .map((cell) => (cell || "").toString())
        .join(" ")
        .toLowerCase();
      if (!searchableText.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });
