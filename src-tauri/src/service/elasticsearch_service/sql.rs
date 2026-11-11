use crate::service::elasticsearch_service::config::ElasticsearchConfig;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::AppState;
use std::collections::BTreeMap;

impl ElasticsearchConfig {
    pub async fn exe_sql(
        &self,
        _list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let client = self.get_connection()?;

        // Parse SQL: SELECT * FROM <index_name> [LIMIT <n>]
        let (index_name, limit) = parse_es_sql_params(&sql);
        info!(
            "Elasticsearch exe_sql: index={}, limit={}",
            index_name, limit
        );

        // Use Elasticsearch search API
        let search_response = client
            .search(elasticsearch::SearchParts::Index(&[&index_name]))
            .body(serde_json::json!({
                "query": { "match_all": {} },
                "size": limit
            }))
            .send()
            .await?;

        let status = search_response.status_code();
        if !status.is_success() {
            let error_text = search_response.text().await.unwrap_or_default();
            return Err(anyhow!("Elasticsearch search failed: {}", error_text));
        }

        let response_body: serde_json::Value = search_response.json().await?;

        // Extract hits
        let hits = response_body
            .get("hits")
            .and_then(|h| h.get("hits"))
            .and_then(|h| h.as_array())
            .cloned()
            .unwrap_or_default();

        if hits.is_empty() {
            return Ok(ExeSqlResponse::new());
        }

        let field_names = collect_field_names(&hits);
        let headers = build_headers(&field_names);
        let rows = build_rows(&hits, &field_names);

        Ok(ExeSqlResponse::from(headers, rows, Some(index_name)))
    }
}

/// Collect all field names from all documents, always including `_id` and `_index`.
pub(super) fn collect_field_names(hits: &[serde_json::Value]) -> Vec<String> {
    let mut all_fields: BTreeMap<String, ()> = BTreeMap::new();
    all_fields.insert("_id".to_string(), ());
    all_fields.insert("_index".to_string(), ());

    for hit in hits {
        if let Some(source) = hit.get("_source").and_then(|s| s.as_object()) {
            for key in source.keys() {
                all_fields.insert(key.clone(), ());
            }
        }
    }

    all_fields.keys().cloned().collect()
}

pub(super) fn build_headers(field_names: &[String]) -> Vec<Header> {
    field_names
        .iter()
        .map(|name| Header {
            name: name.clone(),
            type_name: "String".to_string(),
            is_primary_key: name == "_id",
        })
        .collect()
}

pub(super) fn build_rows(
    hits: &[serde_json::Value],
    field_names: &[String],
) -> Vec<Vec<Option<String>>> {
    let mut rows: Vec<Vec<Option<String>>> = Vec::new();
    for hit in hits {
        let mut row: Vec<Option<String>> = Vec::new();
        let doc_id = hit
            .get("_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let doc_index = hit
            .get("_index")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let source = hit.get("_source").and_then(|s| s.as_object());

        for field_name in field_names {
            let cell = match field_name.as_str() {
                "_id" => doc_id.clone(),
                "_index" => doc_index.clone(),
                _ => source
                    .and_then(|s| s.get(field_name))
                    .and_then(json_value_to_string),
            };
            row.push(cell);
        }
        rows.push(row);
    }
    rows
}

/// Parse SQL to extract index name and limit: SELECT * FROM <index> [LIMIT <n>]
fn parse_es_sql_params(sql: &str) -> (String, i64) {
    let parts: Vec<&str> = sql.split_whitespace().collect();
    let mut index_name = String::new();
    let mut limit: i64 = 100;

    if let Some(from_idx) = parts.iter().position(|p| p.to_uppercase() == "FROM") {
        if from_idx + 1 < parts.len() {
            index_name = parts[from_idx + 1].trim_matches('`').to_string();
        }
    }

    if index_name.is_empty() {
        index_name = sql.trim().to_string();
    }

    if let Some(limit_idx) = parts.iter().position(|p| p.to_uppercase() == "LIMIT") {
        if limit_idx + 1 < parts.len() {
            if let Ok(val) = parts[limit_idx + 1].parse::<i64>() {
                limit = val;
            }
        }
    }

    (index_name, limit)
}

/// Convert a serde_json::Value to an Option<String>
fn json_value_to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::Null => None,
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(format!("{}", n)),
        serde_json::Value::Bool(b) => Some(format!("{}", b)),
        serde_json::Value::Array(arr) => {
            let items: Vec<String> = arr.iter().filter_map(json_value_to_string).collect();
            Some(format!("[{}]", items.join(", ")))
        }
        serde_json::Value::Object(_) => serde_json::to_string(value).ok(),
    }
}

/// Check if an index name matches an Elasticsearch index pattern (e.g., "logs-*", "metricbeat-*.*")
pub(super) fn matches_index_pattern(pattern: &str, index_name: &str) -> bool {
    if pattern == "*" || pattern == "_all" {
        return true;
    }
    // Convert wildcard pattern to a simple glob match
    let parts: Vec<&str> = pattern.split('*').collect();
    if parts.len() == 1 {
        // No wildcard — exact match
        return parts[0] == index_name;
    }

    let mut idx = 0;
    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }
        if let Some(pos) = index_name[idx..].find(part) {
            if i == 0 && pos != 0 {
                // First segment must match from the beginning
                return false;
            }
            idx += pos + part.len();
        } else {
            return false;
        }
    }
    // If last part is empty (pattern ends with *), any suffix is fine
    // Otherwise the remainder must be empty
    if let Some(last) = parts.last() {
        if !last.is_empty() {
            return idx == index_name.len();
        }
    }
    true
}
