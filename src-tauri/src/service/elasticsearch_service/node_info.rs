use crate::service::elasticsearch_service::config::ElasticsearchConfig;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use elasticsearch::cat::CatAliasesParts;
use elasticsearch::cat::CatIndicesParts;
use elasticsearch::cat::CatTemplatesParts;
use elasticsearch::http::response::Response;
use elasticsearch::Elasticsearch;

impl ElasticsearchConfig {
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let client = self.get_connection()?;
        let level_infos = list_node_info_req.level_infos;

        match level_infos.len() {
            // Level 1: Show root categories (Indices, Aliases, Templates, Nodes)
            1 => list_root_categories(&client).await,
            // Level 2: Show items within each category
            2 => {
                let node_name = level_infos[1].config_value.clone();
                list_category_items(&client, node_name.as_str()).await
            }
            _ => {
                info!("level_infos: {:?}", level_infos);
                Ok(ListNodeInfoResponse::new_with_empty())
            }
        }
    }
}

/// Root categories: Indices / Aliases / Templates / Nodes with their entry counts.
async fn list_root_categories(
    client: &Elasticsearch,
) -> Result<ListNodeInfoResponse, anyhow::Error> {
    let indices_count = count_indices(client).await?;
    let aliases_count = count_aliases(client).await?;
    let templates_count = count_templates(client).await?;
    let nodes_count = count_nodes(client).await?;

    let vec = vec![
        category_item("es_indices", "Indices", indices_count),
        category_item("es_aliases", "Aliases", aliases_count),
        category_item("es_templates", "Templates", templates_count),
        category_item("es_nodes", "Nodes", nodes_count),
    ];
    Ok(ListNodeInfoResponse::new(vec))
}

fn category_item(icon_name: &str, name: &str, count: usize) -> ListNodeInfoResponseItem {
    ListNodeInfoResponseItem::new(
        true,
        true,
        icon_name.to_string(),
        name.to_string(),
        if count > 0 {
            Some(format!("({})", count))
        } else {
            None
        },
    )
}

/// Dispatch a level-2 request to the matching category listing.
async fn list_category_items(
    client: &Elasticsearch,
    node_name: &str,
) -> Result<ListNodeInfoResponse, anyhow::Error> {
    let items = match node_name {
        "Indices" => list_indices(client).await?,
        "Aliases" => list_aliases(client).await?,
        "Templates" => list_templates(client).await?,
        "Nodes" => list_nodes(client).await?,
        _ => {
            info!("Unknown ES category: {}", node_name);
            vec![]
        }
    };
    Ok(ListNodeInfoResponse::new(items))
}

/// Fetch a cat API response that must succeed and decode it as a list of JSON objects.
async fn fetch_cat_list(
    response: Response,
    what: &str,
) -> Result<Vec<serde_json::Value>, anyhow::Error> {
    let status = response.status_code();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!("Failed to list {}: {}", what, error_text));
    }
    let items: Vec<serde_json::Value> = response.json().await?;
    Ok(items)
}

/// Fetch a cat API response used only for counting; any failure yields 0 entries.
async fn count_cat_items(response: Response) -> Result<usize, anyhow::Error> {
    if response.status_code().is_success() {
        let items: Vec<serde_json::Value> = response.json().await?;
        return Ok(items.len());
    }
    Ok(0)
}

async fn count_indices(client: &Elasticsearch) -> Result<usize, anyhow::Error> {
    let response = client
        .cat()
        .indices(CatIndicesParts::None)
        .format("json")
        .h(&["index"])
        .send()
        .await?;
    count_cat_items(response).await
}

async fn count_aliases(client: &Elasticsearch) -> Result<usize, anyhow::Error> {
    let response = client
        .cat()
        .aliases(CatAliasesParts::None)
        .format("json")
        .send()
        .await?;
    count_cat_items(response).await
}

async fn count_templates(client: &Elasticsearch) -> Result<usize, anyhow::Error> {
    let response = client
        .cat()
        .templates(CatTemplatesParts::None)
        .format("json")
        .send()
        .await?;
    count_cat_items(response).await
}

async fn count_nodes(client: &Elasticsearch) -> Result<usize, anyhow::Error> {
    let response = client
        .cat()
        .nodes()
        .format("json")
        .h(&["name", "ip", "role", "heapPercent", "ramPercent"])
        .send()
        .await?;
    count_cat_items(response).await
}

async fn list_indices(
    client: &Elasticsearch,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let response = client
        .cat()
        .indices(CatIndicesParts::None)
        .format("json")
        .h(&["index", "docsCount", "storeSize", "status"])
        .send()
        .await?;
    let indices = fetch_cat_list(response, "indices").await?;
    Ok(indices.iter().map(index_item).collect())
}

fn index_item(idx: &serde_json::Value) -> ListNodeInfoResponseItem {
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
    let store_size = idx.get("storeSize").and_then(|v| v.as_str()).unwrap_or("-");

    let description = if store_size != "-" && store_size != "null" {
        Some(format!("{} docs, {}", docs_count, store_size))
    } else {
        Some(format!("{} docs", docs_count))
    };

    ListNodeInfoResponseItem::new(
        true,
        true,
        "singleTable".to_string(),
        index_name,
        description,
    )
}

async fn list_aliases(
    client: &Elasticsearch,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let response = client
        .cat()
        .aliases(CatAliasesParts::None)
        .format("json")
        .send()
        .await?;
    let aliases = fetch_cat_list(response, "aliases").await?;
    Ok(aliases.iter().map(alias_item).collect())
}

fn alias_item(alias: &serde_json::Value) -> ListNodeInfoResponseItem {
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

    ListNodeInfoResponseItem::new(
        true,
        true,
        "es_single_alias".to_string(),
        alias_name,
        description,
    )
}

async fn list_templates(
    client: &Elasticsearch,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let response = client
        .cat()
        .templates(CatTemplatesParts::None)
        .format("json")
        .send()
        .await?;
    let templates = fetch_cat_list(response, "templates").await?;
    Ok(templates.iter().map(template_item).collect())
}

fn template_item(tmpl: &serde_json::Value) -> ListNodeInfoResponseItem {
    let template_name = tmpl
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    let index_patterns = tmpl
        .get("indexPatterns")
        .and_then(|v| v.as_str())
        .unwrap_or("-");
    let order = tmpl.get("order").and_then(|v| v.as_str()).unwrap_or("0");

    let description = if index_patterns != "-" {
        Some(format!("{}, order: {}", index_patterns, order))
    } else {
        Some(format!("order: {}", order))
    };

    ListNodeInfoResponseItem::new(
        true,
        true,
        "es_single_template".to_string(),
        template_name,
        description,
    )
}

async fn list_nodes(
    client: &Elasticsearch,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let response = client
        .cat()
        .nodes()
        .format("json")
        .h(&["name", "ip", "role", "heapPercent", "ramPercent", "version"])
        .send()
        .await?;
    let nodes = fetch_cat_list(response, "nodes").await?;
    Ok(nodes.iter().map(node_item).collect())
}

fn node_item(node: &serde_json::Value) -> ListNodeInfoResponseItem {
    let node_name = node
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    let ip = node.get("ip").and_then(|v| v.as_str()).unwrap_or("-");
    let role = node.get("role").and_then(|v| v.as_str()).unwrap_or("-");
    let heap = node
        .get("heapPercent")
        .and_then(|v| v.as_str())
        .unwrap_or("-");
    let version = node.get("version").and_then(|v| v.as_str()).unwrap_or("-");

    let description = Some(format!(
        "{} | {} | heap: {}% | v{}",
        ip,
        node_role_display(role),
        heap,
        version
    ));

    ListNodeInfoResponseItem::new(
        true,
        true,
        "es_single_node".to_string(),
        node_name,
        description,
    )
}

fn node_role_display(role: &str) -> &str {
    match role {
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
    }
}
