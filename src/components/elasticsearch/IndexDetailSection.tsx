import { FaPaperclip, FaRecycle } from "react-icons/fa";
import type {
  EsIlmPhase,
  EsIndexDetail,
  EsMatchingTemplate,
} from "../../types/elasticsearch";
import KeyValueTable from "../ui/KeyValueTable";
import StatusChip, { type StatusTone } from "../ui/StatusChip";
import { EmptyState, ErrorState, LoadingState } from "../ui/states";

const ILM_PHASES = ["hot", "warm", "cold", "frozen", "delete"] as const;

const ILM_TONE: Record<string, StatusTone> = {
  hot: "error",
  warm: "warning",
  cold: "info",
  frozen: "neutral",
  delete: "neutral",
};

export interface IndexDetailSectionProps {
  showDetail: boolean;
  indexDetail: EsIndexDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onRetry: () => void;
}

const formatCreatedAt = (creationDate?: string): string =>
  creationDate && creationDate !== "-"
    ? new Date(Number.parseInt(creationDate, 10)).toLocaleString("zh-CN")
    : "-";

/** 绑定模板列表：无模板时与拆分前一致地显示"无绑定模板"。 */
function MatchingTemplates({ templates }: { templates: EsMatchingTemplate[] }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-micro text-base-content/45">
        <FaPaperclip size="0.8em" aria-hidden="true" />
        绑定模板（{templates.length}）
      </div>
      {templates.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((template) => (
            <div
              key={template.name}
              className="rounded-[var(--radius-control)] border border-hairline bg-base-100 px-2 py-1"
            >
              <div className="text-xs font-medium text-primary">
                {template.name}
              </div>
              <div className="mt-0.5 font-mono text-micro text-base-content/50">
                patterns: {template.index_patterns}
                {template.order && template.order !== "0" ? (
                  <span className="ml-2">order: {template.order}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-micro text-base-content/45">无绑定模板</span>
      )}
    </div>
  );
}

/** ILM 单个阶段卡片：阶段胶囊 + min_age + actions 明细。 */
function IlmPhaseCard({
  phase,
  phaseData,
}: {
  phase: string;
  phaseData: EsIlmPhase;
}) {
  return (
    <div className="min-w-[150px] flex-shrink-0 rounded-[var(--radius-control)] border border-hairline bg-base-100 px-2 py-1.5">
      <div className="mb-1 flex items-center gap-1">
        <StatusChip tone={ILM_TONE[phase] ?? "neutral"}>
          {phase.toUpperCase()}
        </StatusChip>
        {phaseData.min_age ? (
          <span className="text-micro text-base-content/45">
            {phaseData.min_age}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-micro">
        {phaseData.actions
          ? Object.entries(phaseData.actions).map(([action, config]) => (
              <div key={action}>
                <span className="font-mono font-medium">{action}</span>
                {typeof config === "object" &&
                  config !== null &&
                  Object.keys(config).length > 0 && (
                    <div className="mt-0.5 text-base-content/45">
                      {Object.entries(config).map(([key, value]) => (
                        <span key={key} className="mr-1">
                          {key}:{" "}
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            ))
          : null}
      </div>
    </div>
  );
}

/** 生命周期策略（ILM）：策略名、rollover alias、阶段卡片与完整 JSON。 */
function IlmPolicy({ detail }: { detail: EsIndexDetail }) {
  const ilmPhasesData = detail.ilm_policy_detail?.policy?.phases;

  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-micro text-base-content/45">
        <FaRecycle size="0.8em" aria-hidden="true" />
        生命周期策略（ILM）
      </div>
      {detail.ilm_policy_name ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-primary">
              {detail.ilm_policy_name}
            </span>
            {detail.ilm_rollover_alias ? (
              <span className="text-micro text-base-content/50">
                rollover alias:{" "}
                <code className="text-info">{detail.ilm_rollover_alias}</code>
              </span>
            ) : null}
          </div>

          {ilmPhasesData ? (
            <div className="flex items-start gap-1.5 overflow-x-auto pb-1">
              {ILM_PHASES.map((phase) => {
                const phaseData = ilmPhasesData[phase];
                if (!phaseData) return null;

                return (
                  <IlmPhaseCard
                    key={phase}
                    phase={phase}
                    phaseData={phaseData}
                  />
                );
              })}
            </div>
          ) : null}

          {detail.ilm_policy_detail ? (
            <details className="text-micro">
              <summary className="cursor-pointer text-base-content/45 hover:text-base-content/70">
                查看完整策略 JSON
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-control)] bg-base-200 p-2 text-micro">
                {JSON.stringify(detail.ilm_policy_detail, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : (
        <span className="text-micro text-base-content/45">未配置 ILM 策略</span>
      )}
    </div>
  );
}

/** 索引详情折叠区：三态 + 分片/副本/UUID/创建时间 + 模板 + ILM。 */
function IndexDetailSection({
  showDetail,
  indexDetail,
  detailLoading,
  detailError,
  onRetry,
}: IndexDetailSectionProps) {
  if (!showDetail) return null;

  const matchingTemplates: EsMatchingTemplate[] =
    indexDetail?.matching_templates ?? [];
  const createdAt = formatCreatedAt(indexDetail?.creation_date);

  return (
    <div className="flex-shrink-0 space-y-2 border-b border-hairline bg-base-200/30 px-3 py-2">
      {detailLoading ? (
        <LoadingState label="正在读取索引详情…" />
      ) : detailError ? (
        <ErrorState
          title="索引详情读取失败"
          description={detailError}
          onRetry={onRetry}
        />
      ) : indexDetail ? (
        <>
          <KeyValueTable
            labelWidth="4.5rem"
            rows={[
              {
                label: "分片数",
                value: (
                  <span className="font-mono">
                    {indexDetail.number_of_shards ?? "-"}
                  </span>
                ),
              },
              {
                label: "副本数",
                value: (
                  <span className="font-mono">
                    {indexDetail.number_of_replicas ?? "-"}
                  </span>
                ),
              },
              {
                label: "UUID",
                value: (
                  <span className="break-all font-mono">
                    {indexDetail.uuid || "-"}
                  </span>
                ),
              },
              {
                label: "创建时间",
                value: <span className="font-mono">{createdAt}</span>,
              },
            ]}
          />

          <MatchingTemplates templates={matchingTemplates} />

          <IlmPolicy detail={indexDetail} />
        </>
      ) : (
        <EmptyState
          compact
          title="暂无索引详情"
          description="后端没有返回该索引的模板与 ILM 信息。"
        />
      )}
    </div>
  );
}

export default IndexDetailSection;
