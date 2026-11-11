use crate::service::elasticsearch_service::config::ElasticsearchConfig;
use crate::service::elasticsearch_service::sql::{
    build_headers, build_rows, collect_field_names, matches_index_pattern,
};
use crate::vojo::exe_sql_response::ExeSqlResponse;
use elasticsearch::cat::CatTemplatesParts;
use elasticsearch::Elasticsearch;

impl ElasticsearchConfig {
    /// Search documents in an Elasticsearch index with optional text query and pagination.
    /// `query` is a simple text search; `search_query` is a raw Elasticsearch query JSON string.
    /// If both are provided, `search_query` takes precedence.
    pub async fn search_documents(
        &self,
        index_name: String,
        query: Option<String>,
        search_query: Option<String>,
        from: i64,
        size: i64,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let client = self.get_connection()?;

        let query_body = if let Some(ref sq) = search_query {
            // Raw query JSON takes precedence
            serde_json::from_str::<serde_json::Value>(sq)
                .map_err(|e| anyhow!("Invalid search query JSON: {}", e))?
        } else if let Some(ref q) = query {
            if q.trim().is_empty() {
                serde_json::json!({ "match_all": {} })
            } else {
                serde_json::json!({
                    "multi_match": {
                        "query": q,
                        "fields": ["*"],
                        "type": "best_fields"
                    }
                })
            }
        } else {
            serde_json::json!({ "match_all": {} })
        };

        let search_body = serde_json::json!({
            "query": query_body,
            "from": from,
            "size": size
        });

        info!(
            "Elasticsearch search_documents: index={}, from={}, size={}, query={:?}",
            index_name, from, size, query
        );

        let search_response = client
            .search(elasticsearch::SearchParts::Index(&[&index_name]))
            .body(search_body)
            .send()
            .await?;

        let status = search_response.status_code();
        if !status.is_success() {
            let error_text = search_response.text().await.unwrap_or_default();
            return Err(anyhow!("Elasticsearch search failed: {}", error_text));
        }

        let response_body: serde_json::Value = search_response.json().await?;

        // Extract total count
        let total_hits = response_body
            .get("hits")
            .and_then(|h| h.get("total"))
            .and_then(|t| {
                t.as_i64()
                    .or_else(|| t.get("value").and_then(|v| v.as_i64()))
            })
            .unwrap_or(0);

        // Extract hits
        let hits = response_body
            .get("hits")
            .and_then(|h| h.get("hits"))
            .and_then(|h| h.as_array())
            .cloned()
            .unwrap_or_default();

        if hits.is_empty() {
            let mut resp = ExeSqlResponse::new();
            resp.total_count = Some(total_hits);
            return Ok(resp);
        }

        let field_names = collect_field_names(&hits);
        let headers = build_headers(&field_names);
        let rows = build_rows(&hits, &field_names);

        let mut resp = ExeSqlResponse::from(headers, rows, Some(index_name));
        resp.total_count = Some(total_hits);
        Ok(resp)
    }

    /// Get index detail: settings, matching templates, ILM policy.
    /// Returns a JSON string with all metadata.
    pub async fn get_index_detail(
        &self,
        index_name: String,
    ) -> Result<serde_json::Value, anyhow::Error> {
        let client = self.get_connection()?;

        // 1. Fetch index settings
        let settings_info = fetch_index_settings(&client, &index_name).await?;

        // Extract key settings
        let index_settings = settings_info
            .get("settings")
            .and_then(|s| s.get("index"))
            .cloned()
            .unwrap_or(serde_json::json!({}));

        let ilm_policy_name = lifecycle_setting(&index_settings, "name");
        let ilm_rollover_alias = lifecycle_setting(&index_settings, "rollover_alias");

        let number_of_shards = setting_str(&index_settings, "number_of_shards");
        let number_of_replicas = setting_str(&index_settings, "number_of_replicas");
        let creation_date = setting_str(&index_settings, "creation_date");
        let provided_name = setting_str(&index_settings, "provided_name");
        let uuid = setting_str(&index_settings, "uuid");

        // 2. Find matching templates
        let matching_templates = fetch_matching_templates(&client, &index_name).await?;

        // 3. Fetch ILM policy if present
        let ilm_policy_detail = fetch_ilm_policy_detail(&client, &ilm_policy_name).await?;

        Ok(serde_json::json!({
            "index_name": index_name,
            "provided_name": provided_name,
            "uuid": uuid,
            "creation_date": creation_date,
            "number_of_shards": number_of_shards,
            "number_of_replicas": number_of_replicas,
            "ilm_policy_name": ilm_policy_name,
            "ilm_rollover_alias": ilm_rollover_alias,
            "matching_templates": matching_templates,
            "ilm_policy_detail": ilm_policy_detail,
        }))
    }
}

/// Fetch the raw `GET <index>` payload; an unsuccessful response yields an empty object.
async fn fetch_index_settings(
    client: &Elasticsearch,
    index_name: &str,
) -> Result<serde_json::Value, anyhow::Error> {
    let settings_response = client
        .indices()
        .get(elasticsearch::indices::IndicesGetParts::Index(&[
            index_name,
        ]))
        .send()
        .await?;

    let mut settings_info: serde_json::Value = serde_json::json!({});
    if settings_response.status_code().is_success() {
        let body: serde_json::Value = settings_response.json().await?;
        // body is { "<index_name>": { "aliases": {}, "mappings": {}, "settings": { "index": { ... } } } }
        if let Some(index_data) = body
            .get(index_name)
            .or_else(|| body.as_object().and_then(|m| m.values().next()))
        {
            settings_info = index_data.clone();
        }
    }
    Ok(settings_info)
}

fn setting_str(index_settings: &serde_json::Value, key: &str) -> String {
    index_settings
        .get(key)
        .and_then(|v| v.as_str())
        .unwrap_or("-")
        .to_string()
}

fn lifecycle_setting(index_settings: &serde_json::Value, key: &str) -> String {
    index_settings
        .get("lifecycle")
        .and_then(|l| l.get(key))
        .and_then(|n| n.as_str())
        .unwrap_or_default()
        .to_string()
}

/// Find the index templates whose index patterns match `index_name`.
async fn fetch_matching_templates(
    client: &Elasticsearch,
    index_name: &str,
) -> Result<Vec<serde_json::Value>, anyhow::Error> {
    let templates_response = client
        .cat()
        .templates(CatTemplatesParts::None)
        .format("json")
        .send()
        .await?;

    let mut matching_templates: Vec<serde_json::Value> = vec![];
    if templates_response.status_code().is_success() {
        let templates: Vec<serde_json::Value> = templates_response.json().await?;
        for tmpl in templates {
            let tmpl_name = tmpl.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let patterns_str = tmpl
                .get("indexPatterns")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // Check if index name matches any pattern
            let patterns: Vec<&str> = patterns_str.split(',').map(|p| p.trim()).collect();
            for pattern in patterns {
                if matches_index_pattern(pattern, index_name) {
                    matching_templates.push(serde_json::json!({
                        "name": tmpl_name,
                        "index_patterns": patterns_str,
                        "order": tmpl.get("order").and_then(|v| v.as_str()).unwrap_or("0"),
                    }));
                    break;
                }
            }
        }
    }
    Ok(matching_templates)
}

/// Fetch the ILM policy body referenced by the index, if any.
async fn fetch_ilm_policy_detail(
    client: &Elasticsearch,
    ilm_policy_name: &str,
) -> Result<serde_json::Value, anyhow::Error> {
    if ilm_policy_name.is_empty() {
        return Ok(serde_json::json!(null));
    }

    let ilm_response = client
        .ilm()
        .get_lifecycle(elasticsearch::ilm::IlmGetLifecycleParts::Policy(
            ilm_policy_name,
        ))
        .send()
        .await?;

    if !ilm_response.status_code().is_success() {
        return Ok(serde_json::json!(null));
    }

    let ilm_body: serde_json::Value = ilm_response.json().await?;
    // Structure: { "<policy_name>": { "version": ..., "modified_date": ..., "policy": { "phases": { ... } } } }
    Ok(ilm_body.get(ilm_policy_name).cloned().unwrap_or(ilm_body))
}
