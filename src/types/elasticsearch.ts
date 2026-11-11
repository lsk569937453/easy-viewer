/** elasticsearch_index_detail 返回 serde_json::Value；这里只声明前端消费的字段。 */
export interface EsMatchingTemplate {
  name: string;
  index_patterns: string;
  order?: string;
}

export interface EsIlmPhase {
  min_age?: string;
  actions?: Record<string, unknown>;
}

export interface EsIlmPolicyDetail {
  policy?: {
    phases?: Record<string, EsIlmPhase>;
  };
}

export interface EsIndexDetail {
  number_of_shards?: string | number;
  number_of_replicas?: string | number;
  uuid?: string;
  creation_date?: string;
  matching_templates?: EsMatchingTemplate[];
  ilm_policy_name?: string | null;
  ilm_rollover_alias?: string | null;
  ilm_policy_detail?: EsIlmPolicyDetail;
}
