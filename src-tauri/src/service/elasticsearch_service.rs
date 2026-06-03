use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use elasticsearch::auth::Credentials;
use elasticsearch::cat::CatIndicesParts;
use elasticsearch::http::transport::SingleNodeConnectionPool;
use elasticsearch::http::transport::TransportBuilder;
use elasticsearch::Elasticsearch;
use serde::Deserialize;
use serde::Serialize;
use std::collections::BTreeMap;
use url::Url;

#[derive(Deserialize, Serialize, Clone)]
pub struct ElasticsearchConfig {
    pub config: DatabaseHostStruct,
}

impl ElasticsearchConfig {
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let client = self.get_connection()?;
        let response = client.ping().send().await?;
        let status = response.status_code();
        if !status.is_success() {
            return Err(anyhow!("Elasticsearch ping failed with status: {}", status));
        }
        Ok(())
    }

    fn get_connection(&self) -> Result<Elasticsearch, anyhow::Error> {
        let protocol = if self.config.port == 443 {
            "https"
        } else {
            "http"
        };
        let url_str = format!("{}://{}:{}", protocol, self.config.host, self.config.port);
        let url = Url::parse(&url_str)?;

        let conn_pool = SingleNodeConnectionPool::new(url);
        let mut builder = TransportBuilder::new(conn_pool);

        if !self.config.user_name.is_empty() {
            let credentials = Credentials::Basic(
                self.config.user_name.clone().into(),
                self.config.password.clone().into(),
            );
            builder = builder.auth(credentials);
        }

        let transport = builder.build()?;
        Ok(Elasticsearch::new(transport))
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let client = self.get_connection()?;
        let level_infos = list_node_info_req.level_infos;
        let mut vec = vec![];

        match level_infos.len() {
            // Level 1: Show index categories
            1 => {
                let response = client
                    .cat()
                    .indices(CatIndicesParts::None)
                    .format("json")
                    .send()
                    .await?;

                let status = response.status_code();
                if !status.is_success() {
                    let error_text = response.text().await.unwrap_or_default();
                    return Err(anyhow!("Failed to list indices: {}", error_text));
                }

                let indices: Vec<serde_json::Value> = response.json().await?;
                let total_count = indices.len();

                // Show "Indices" folder with count
                let indices_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "es_indices".to_string(),
                    "Indices".to_string(),
                    if total_count > 0 {
                        Some(format!("({})", total_count))
                    } else {
                        None
                    },
                );
                vec.push(indices_item);

                return Ok(ListNodeInfoResponse::new(vec));
            }
            // Level 2: Show individual indices
            2 => {
                let node_name = level_infos[1].config_value.clone();
                if node_name == "Indices" {
                    let response = client
                        .cat()
                        .indices(CatIndicesParts::None)
                        .format("json")
                        .h(&["index", "docsCount", "storeSize", "status"])
                        .send()
                        .await?;

                    let indices: Vec<serde_json::Value> = response.json().await?;

                    for idx in indices {
                        let index_name = idx
                            .get("index")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string();
                        let docs_count = idx
                            .get("docsCount")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0")
                            .to_string();
                        let store_size = idx
                            .get("storeSize")
                            .and_then(|v| v.as_str())
                            .unwrap_or("-");

                        let description = if store_size != "-" && store_size != "null" {
                            Some(format!("{} docs, {}", docs_count, store_size))
                        } else {
                            Some(format!("{} docs", docs_count))
                        };

                        let item = ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "singleTable".to_string(),
                            index_name,
                            description,
                        );
                        vec.push(item);
                    }
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {:?}", level_infos);
            }
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }

    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let client = self.get_connection()?;

        // Parse SQL: SELECT * FROM <index_name> [LIMIT <n>]
        let (index_name, limit) = parse_es_sql_params(&sql);
        info!("Elasticsearch exe_sql: index={}, limit={}", index_name, limit);

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

        // Collect all field names from all documents
        let mut all_fields: BTreeMap<String, ()> = BTreeMap::new();
        // Always include _id and _index
        all_fields.insert("_id".to_string(), ());
        all_fields.insert("_index".to_string(), ());

        for hit in &hits {
            if let Some(source) = hit.get("_source").and_then(|s| s.as_object()) {
                for key in source.keys() {
                    all_fields.insert(key.clone(), ());
                }
            }
        }

        let field_names: Vec<String> = all_fields.keys().cloned().collect();

        let headers: Vec<Header> = field_names
            .iter()
            .map(|name| Header {
                name: name.clone(),
                type_name: "String".to_string(),
                is_primary_key: name == "_id",
            })
            .collect();

        // Build rows
        let mut rows: Vec<Vec<Option<String>>> = Vec::new();
        for hit in &hits {
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

            for field_name in &field_names {
                let cell = match field_name.as_str() {
                    "_id" => doc_id.clone(),
                    "_index" => doc_index.clone(),
                    _ => source
                        .and_then(|s| s.get(field_name))
                        .and_then(|v| json_value_to_string(v)),
                };
                row.push(cell);
            }
            rows.push(row);
        }

        Ok(ExeSqlResponse::from(headers, rows, Some(index_name)))
    }
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
