import { FaClock, FaCopy } from "react-icons/fa";
import { IoRefresh, IoTrashOutline } from "react-icons/io5";
import { SiRedis } from "react-icons/si";
import { formatBytes, formatTtl } from "../../utils/format";
import ActionButton from "../ui/ActionButton";
import KeyValueTable from "../ui/KeyValueTable";
import PageHeader from "../ui/PageHeader";
import StatusChip from "../ui/StatusChip";
import type { RedisTypeMeta } from "./redisKeyUtils";

export interface RedisKeyDetailHeaderProps {
  keyName: string | undefined;
  connectionName: string;
  typeMeta: RedisTypeMeta;
  ttl: number | null;
  memoryUsage: number | null;
  itemCount: number;
  loading: boolean;
  onRefresh: () => void;
  onOpenTtl: () => void;
  onRequestDelete: () => void;
  onCopyKey: () => void;
}

/** Redis 键详情页头 + 键信息（KV 展示）。 */
export function RedisKeyDetailHeader({
  keyName,
  connectionName,
  typeMeta,
  ttl,
  memoryUsage,
  itemCount,
  loading,
  onRefresh,
  onOpenTtl,
  onRequestDelete,
  onCopyKey,
}: RedisKeyDetailHeaderProps) {
  const metaRows = [
    {
      label: "键名",
      value: (
        <span className="flex items-start gap-1">
          <span className="min-w-0 break-all font-mono">{keyName}</span>
          <ActionButton
            variant="icon"
            title="复制键名"
            aria-label="复制键名"
            onClick={onCopyKey}
            icon={<FaCopy size="0.7em" aria-hidden="true" />}
          />
        </span>
      ),
    },
    { label: "过期时间", value: formatTtl(ttl) },
    {
      label: "内存占用",
      value: memoryUsage === null ? "—" : formatBytes(memoryUsage),
    },
    { label: "条目数量", value: `${itemCount} 项` },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
            <SiRedis
              className="flex-shrink-0 text-error"
              size="0.95em"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">{keyName}</span>
          </span>
        }
        subtitle={`连接 ${connectionName}`}
        meta={<StatusChip tone={typeMeta.tone}>{typeMeta.label}</StatusChip>}
        actions={
          <>
            <ActionButton
              size="sm"
              title="刷新"
              icon={<IoRefresh aria-hidden="true" />}
              loading={loading}
              onClick={onRefresh}
            >
              刷新
            </ActionButton>
            <ActionButton
              size="sm"
              title="设置过期时间"
              icon={<FaClock aria-hidden="true" />}
              onClick={onOpenTtl}
            >
              过期时间
            </ActionButton>
            <ActionButton
              size="sm"
              variant="danger"
              icon={<IoTrashOutline aria-hidden="true" />}
              onClick={onRequestDelete}
            >
              删除
            </ActionButton>
          </>
        }
      />

      {/* 键信息（KV 展示） */}
      <div className="flex-shrink-0 border-b border-hairline bg-base-200/25 px-2 py-0.5">
        <KeyValueTable rows={metaRows} labelWidth="4.5rem" />
      </div>
    </>
  );
}
