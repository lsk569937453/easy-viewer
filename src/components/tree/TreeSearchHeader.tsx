import SearchBox from "../ui/SearchBox";

interface TreeSearchHeaderProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  query: string;
  matchCount: number;
}

/** 树搜索区：搜索框 + 过滤态下的匹配计数。 */
function TreeSearchHeader({
  value,
  onChange,
  onClear,
  onSubmit,
  query,
  matchCount,
}: TreeSearchHeaderProps) {
  return (
    <div className="flex-shrink-0 px-2 pb-1 pt-2">
      <SearchBox
        value={value}
        onChange={onChange}
        placeholder="搜索节点…"
        ariaLabel="搜索节点"
        onClear={onClear}
        onSubmit={onSubmit}
      />
      {query ? (
        <div className="px-1 pt-1 text-micro text-base-content/45">
          {matchCount > 0 ? `${matchCount} 项匹配` : "无匹配结果"}
        </div>
      ) : null}
    </div>
  );
}

export default TreeSearchHeader;
