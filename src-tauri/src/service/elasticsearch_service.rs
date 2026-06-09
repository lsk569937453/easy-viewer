use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use elasticsearch::auth::Credentials;
use elasticsearch::cat::CatAliasesParts;
use elasticsearch::cat::CatIndicesParts;
use elasticsearch::cat::CatTemplatesParts;
use elasticsearch::http::transport::SingleNodeConnectionPool;
use elasticsearch::http::transport::TransportBuilder;
use elasticsearch::Elasticsearch;
use serde::Deserialize;
use serde::Serialize;
use std::collections::BTreeMap;
use std::time::Duration;
use tokio::time::timeout;
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

    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let client = self.get_connection()?;
        let response = timeout(Duration::from_secs(1), client.info().send())
            .await
            .map_err(|_| anyhow!("Connect timeout"))??;
        let status = response.status_code();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Elasticsearch info request failed with status {}: {}", status, error_text));
        }
        let body: serde_json::Value = response.json().await?;
        let version = body
            .get("version")
            .and_then(|v| v.get("number"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("version.number not found in Elasticsearch response"))?;
        Ok(version.to_string())
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let client = self.get_connection()?;
        let response = timeout(Duration::from_secs(1), client.ping().send())
            .await
            .map_err(|_| anyhow!("Connect timeout"))??;
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
            // Level 1: Show root categories (Indices, Aliases, Templates, Nodes)
            1 => {
                // Get indices count
                let indices_response = client
                    .cat()
                    .indices(CatIndicesParts::None)
                    .format("json")
                    .h(&["index"])
                    .send()
                    .await?;
                let indices_count = if indices_response.status_code().is_success() {
                    let indices: Vec<serde_json::Value> = indices_response.json().await?;
                    indices.len()
                } else {
                    0
                };

                let indices_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "es_indices".to_string(),
                    "Indices".to_string(),
                    if indices_count > 0 {
                        Some(format!("({})", indices_count))
                    } else {
                        None
                    },
                );
                vec.push(indices_item);

                // Get aliases count
                let aliases_response = client
                    .cat()
                    .aliases(CatAliasesParts::None)
                    .format("json")
                    .send()
                    .await?;
                let aliases_count = if aliases_response.status_code().is_success() {
                    let aliases: Vec<serde_json::Value> = aliases_response.json().await?;
                    aliases.len()
                } else {
                    0
                };

                let aliases_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "es_aliases".to_string(),
                    "Aliases".to_string(),
                    if aliases_count > 0 {
                        Some(format!("({})", aliases_count))
                    } else {
                        None
                    },
                );
                vec.push(aliases_item);

                // Get templates count
                let templates_response = client
                    .cat()
                    .templates(CatTemplatesParts::None)
                    .format("json")
                    .send()
                    .await?;
                let templates_count = if templates_response.status_code().is_success() {
                    let templates: Vec<serde_json::Value> = templates_response.json().await?;
                    templates.len()
                } else {
                    0
                };

                let templates_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "es_templates".to_string(),
                    "Templates".to_string(),
                    if templates_count > 0 {
                        Some(format!("({})", templates_count))
                    } else {
                        None
                    },
                );
                vec.push(templates_item);

                // Get nodes count
                let nodes_response = client
                    .cat()
                    .nodes()
                    .format("json")
                    .h(&["name", "ip", "role", "heapPercent", "ramPercent"])
                    .send()
                    .await?;
                let nodes_count = if nodes_response.status_code().is_success() {
                    let nodes: Vec<serde_json::Value> = nodes_response.json().await?;
                    nodes.len()
                } else {
                    0
                };

                let nodes_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "es_nodes".to_string(),
                    "Nodes".to_string(),
                    if nodes_count > 0 {
                        Some(format!("({})", nodes_count))
                    } else {
                        None
                    },
                );
                vec.push(nodes_item);

                return Ok(ListNodeInfoResponse::new(vec));
            }
            // Level 2: Show items within each category
            2 => {
                let node_name = level_infos[1].config_value.clone();

                match node_name.as_str() {
                    "Indices" => {
                        let response = client
                            .cat()
                            .indices(CatIndicesParts::None)
                            .format("json")
                            .h(&["index", "docsCount", "storeSize", "status"])
                            .send()
                            .await?;

                        let status = response.status_code();
                        if !status.is_success() {
                            let error_text = response.text().await.unwrap_or_default();
                            return Err(anyhow!("Failed to list indices: {}", error_text));
                        }

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
                    "Aliases" => {
                        let response = client
                            .cat()
                            .aliases(CatAliasesParts::None)
                            .format("json")
                            .send()
                            .await?;

                        let status = response.status_code();
                        if !status.is_success() {
                            let error_text = response.text().await.unwrap_or_default();
                            return Err(anyhow!("Failed to list aliases: {}", error_text));
                        }

                        let aliases: Vec<serde_json::Value> = response.json().await?;

                        for alias in aliases {
                            let alias_name = alias
                                .get("alias")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string();
                            let index_name = alias
                                .get("index")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-")
                                .to_string();
                            let is_write_index = alias
                                .get("isWriteIndex")
                                .and_then(|v| v.as_str())
                                .unwrap_or("false");

                            let description = if is_write_index == "true" {
                                Some(format!("→ {} (write)", index_name))
                            } else {
                                Some(format!("→ {}", index_name))
                            };

                            let item = ListNodeInfoResponseItem::new(
                                true,
                                true,
                                "es_single_alias".to_string(),
                                alias_name,
                                description,
                            );
                            vec.push(item);
                        }
                    }
                    "Templates" => {
                        let response = client
                            .cat()
                            .templates(CatTemplatesParts::None)
                            .format("json")
                            .send()
                            .await?;

                        let status = response.status_code();
                        if !status.is_success() {
                            let error_text = response.text().await.unwrap_or_default();
                            return Err(anyhow!("Failed to list templates: {}", error_text));
                        }

                        let templates: Vec<serde_json::Value> = response.json().await?;

                        for tmpl in templates {
                            let template_name = tmpl
                                .get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string();
                            let index_patterns = tmpl
                                .get("indexPatterns")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");
                            let order = tmpl
                                .get("order")
                                .and_then(|v| v.as_str())
                                .unwrap_or("0");

                            let description = if index_patterns != "-" {
                                Some(format!("{}, order: {}", index_patterns, order))
                            } else {
                                Some(format!("order: {}", order))
                            };

                            let item = ListNodeInfoResponseItem::new(
                                true,
                                true,
                                "es_single_template".to_string(),
                                template_name,
                                description,
                            );
                            vec.push(item);
                        }
                    }
                    "Nodes" => {
                        let response = client
                            .cat()
                            .nodes()
                            .format("json")
                            .h(&["name", "ip", "role", "heapPercent", "ramPercent", "version"])
                            .send()
                            .await?;

                        let status = response.status_code();
                        if !status.is_success() {
                            let error_text = response.text().await.unwrap_or_default();
                            return Err(anyhow!("Failed to list nodes: {}", error_text));
                        }

                        let nodes: Vec<serde_json::Value> = response.json().await?;

                        for node in nodes {
                            let node_name = node
                                .get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string();
                            let ip = node
                                .get("ip")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");
                            let role = node
                                .get("role")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");
                            let heap = node
                                .get("heapPercent")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");
                            let version = node
                                .get("version")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");

                            let role_display = match role {
                                "c" => "cluster_manager",
                                "d" => "data",
                                "i" => "ingest",
                                "m" => "master",
                                "l" => "ml",
                                "r" => "remote_cluster_client",
                                "s" => "search",
                                "v" => "voting_only",
                                "h" => "data_hot",
                                "w" => "data_warm",
                                "k" => "data_cold",
                                "f" => "data_frozen",
                                "t" => "transform",
                                _ => role,
                            };

                            let description = Some(format!(
                                "{} | {} | heap: {}% | v{}",
                                ip, role_display, heap, version
                            ));

                            let item = ListNodeInfoResponseItem::new(
                                true,
                                true,
                                "es_single_node".to_string(),
                                node_name,
                                description,
                            );
                            vec.push(item);
                        }
                    }
                    _ => {
                        info!("Unknown ES category: {}", node_name);
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

        // Collect all field names from all documents
        let mut all_fields: BTreeMap<String, ()> = BTreeMap::new();
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
        let settings_response = client
            .indices()
            .get(elasticsearch::indices::IndicesGetParts::Index(&[&index_name]))
            .send()
            .await?;

        let mut settings_info: serde_json::Value = serde_json::json!({});
        if settings_response.status_code().is_success() {
            let body: serde_json::Value = settings_response.json().await?;
            // body is { "<index_name>": { "aliases": {}, "mappings": {}, "settings": { "index": { ... } } } }
            if let Some(index_data) = body.get(&index_name).or_else(|| body.as_object().and_then(|m| m.values().next())) {
                settings_info = index_data.clone();
            }
        }

        // Extract key settings
        let index_settings = settings_info
            .get("settings")
            .and_then(|s| s.get("index"))
            .cloned()
            .unwrap_or(serde_json::json!({}));

        let ilm_policy_name = index_settings
            .get("lifecycle")
            .and_then(|l| l.get("name"))
            .and_then(|n| n.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default();

        let ilm_rollover_alias = index_settings
            .get("lifecycle")
            .and_then(|l| l.get("rollover_alias"))
            .and_then(|n| n.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default();

        let number_of_shards = index_settings
            .get("number_of_shards")
            .and_then(|v| v.as_str())
            .unwrap_or("-")
            .to_string();

        let number_of_replicas = index_settings
            .get("number_of_replicas")
            .and_then(|v| v.as_str())
            .unwrap_or("-")
            .to_string();

        let creation_date = index_settings
            .get("creation_date")
            .and_then(|v| v.as_str())
            .unwrap_or("-")
            .to_string();

        let provided_name = index_settings
            .get("provided_name")
            .and_then(|v| v.as_str())
            .unwrap_or("-")
            .to_string();

        let uuid = index_settings
            .get("uuid")
            .and_then(|v| v.as_str())
            .unwrap_or("-")
            .to_string();

        // 2. Find matching templates
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
                let patterns_str = tmpl.get("indexPatterns").and_then(|v| v.as_str()).unwrap_or("");

                // Check if index name matches any pattern
                let patterns: Vec<&str> = patterns_str.split(',').map(|p| p.trim()).collect();
                for pattern in patterns {
                    if matches_index_pattern(pattern, &index_name) {
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

        // 3. Fetch ILM policy if present
        let mut ilm_policy_detail: serde_json::Value = serde_json::json!(null);
        if !ilm_policy_name.is_empty() {
            let ilm_response = client
                .ilm()
                .get_lifecycle(elasticsearch::ilm::IlmGetLifecycleParts::Policy(&ilm_policy_name))
                .send()
                .await?;

            if ilm_response.status_code().is_success() {
                let ilm_body: serde_json::Value = ilm_response.json().await?;
                // Structure: { "<policy_name>": { "version": ..., "modified_date": ..., "policy": { "phases": { ... } } } }
                ilm_policy_detail = ilm_body
                    .get(&ilm_policy_name)
                    .cloned()
                    .unwrap_or(ilm_body);
            }
        }

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
fn matches_index_pattern(pattern: &str, index_name: &str) -> bool {
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
