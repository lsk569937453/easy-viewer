use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use human_bytes::human_bytes;
use mongodb::bson::Document;
use mongodb::Collection;
use std::collections::BTreeMap;
use std::sync::OnceLock;

use linked_hash_map::LinkedHashMap;
use mongodb::options::ClientOptions;
use mongodb::Client;
use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;
use tokio::time::timeout;
static MONGODB_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_mysql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MONGODB_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Collections", "collections");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MongodbConfig {
    pub config: DatabaseHostStruct,
}
impl MongodbConfig {
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let client = self.get_connection().await?;
        let level_infos = &list_node_info_req.level_infos;

        // level_infos structure for MongoDB collection query:
        // [0] = connection id, [1] = database name, [2] = "Collections" folder, [3] = collection name
        // But the SQL from frontend is like: SELECT * FROM <collection> LIMIT <n> OFFSET <m>
        // We need database name from level_infos and collection name from SQL

        if level_infos.len() < 2 {
            return Ok(ExeSqlResponse::new());
        }

        let database_name = level_infos[1].config_value.clone();
        let database = client.database(&database_name);

        // Parse SQL to extract collection name, limit, and offset
        let (collection_name, limit, offset) = parse_sql_params(&sql);
        let collection: Collection<Document> = database.collection(&collection_name);

        // Build find options
        let find_options = mongodb::options::FindOptions::builder()
            .limit(Some(limit as i64))
            .skip(Some(offset as u64))
            .build();

        let mut cursor = collection.find(Document::new()).with_options(find_options).await?;

        // Collect all field names across documents (using BTreeMap for consistent ordering)
        let mut all_keys: BTreeMap<String, ()> = BTreeMap::new();
        let mut documents: Vec<Document> = Vec::new();

        while cursor.advance().await? {
            let doc = cursor.deserialize_current()?;
            for key in doc.keys() {
                all_keys.insert(key.clone(), ());
            }
            documents.push(doc);
        }

        // Build headers from collected keys, ensure _id is first
        let mut field_names: Vec<String> = Vec::new();
        if all_keys.contains_key("_id") {
            field_names.push("_id".to_string());
        }
        for key in all_keys.keys() {
            if key != "_id" {
                field_names.push(key.clone());
            }
        }

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
        for doc in &documents {
            let mut row: Vec<Option<String>> = Vec::new();
            for field_name in &field_names {
                let value = doc.get(field_name).and_then(|v| bson_value_to_string(v));
                row.push(value);
            }
            rows.push(row);
        }

        Ok(ExeSqlResponse::from(headers, rows, Some(collection_name)))
    }
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mongodb".to_string());
        let client_options = ClientOptions::parse(&test_url).await?;
        let client = Client::with_options(client_options)?;
        timeout(Duration::from_millis(500), client.list_databases())
            .await
            .map_err(|_| anyhow!("Connect timeout"))?
            .map_err(|e| anyhow!("Connect error:{:?}", e))?;
        Ok(())
    }
    async fn get_connection(&self) -> Result<Client, anyhow::Error> {
        let mongodb_url = self.config.to_url("mongodb".to_string());
        info!("mongodb_url: {}", mongodb_url);
        let client_options = ClientOptions::parse(&mongodb_url).await?;
        let client = Client::with_options(client_options)?;
        Ok(client)
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];
        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let client = self.get_connection().await?;
                let database_names = client.list_databases().await.map_err(|e| anyhow!(e))?;
                for database_specification in database_names {
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "database".to_string(),
                        database_specification.name,
                        Some(human_bytes(database_specification.size_on_disk as f64)),
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            2 => {
                let client = self.get_connection().await?;
                let database_name = level_infos[1].config_value.clone();
                let database = client.database(&database_name);

                let collection_count = database
                    .list_collection_names()
                    .await
                    .map_err(|e| anyhow!(e))?
                    .len();
                info!(
                    "database:{},collection_count: {}",
                    database_name, collection_count
                );
                for (name, icon_name) in get_mysql_database_data().iter() {
                    let description = if *name == "Collections" && collection_count > 0 {
                        Some(format!("({})", collection_count))
                    } else {
                        None
                    };
                    info!("description: {}", collection_count);
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        icon_name.to_string(),
                        name.to_string(),
                        description,
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            3 => {
                let client = self.get_connection().await?;
                let database_name = level_infos[1].config_value.clone();
                let database = client.database(&database_name);

                let collection_names = database
                    .list_collection_names()
                    .await
                    .map_err(|e| anyhow!(e))?;
                for collection_name in collection_names {
                    let collection: Collection<Document> = database.collection(&collection_name);
                    let record_count = collection.count_documents(Document::new()).await?;
                    let description = if record_count > 0 {
                        Some(format!("{}", record_count))
                    } else {
                        None
                    };
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "singleTable".to_string(),
                        collection_name,
                        description,
                    );
                    vec.push(list_node_info_response_item);
                }

                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {:?}", level_infos);
            }
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }
}

/// Parse SQL string to extract collection name, limit, and offset.
/// Expected format: SELECT * FROM <collection> [LIMIT <n>] [OFFSET <m>]
fn parse_sql_params(sql: &str) -> (String, i64, i64) {
    let sql_upper = sql.to_uppercase();
    let parts: Vec<&str> = sql.split_whitespace().collect();

    let mut collection_name = String::new();
    let mut limit: i64 = 100;
    let mut offset: i64 = 0;

    // Find FROM keyword and extract collection name
    if let Some(from_idx) = parts.iter().position(|p| p.to_uppercase() == "FROM") {
        if from_idx + 1 < parts.len() {
            collection_name = parts[from_idx + 1].to_string();
            // Remove backticks if present
            collection_name = collection_name.trim_matches('`').to_string();
        }
    }

    // If no FROM found, try to use the whole SQL as collection name (fallback)
    if collection_name.is_empty() {
        collection_name = sql.trim().to_string();
    }

    // Find LIMIT
    if let Some(limit_idx) = parts.iter().position(|p| p.to_uppercase() == "LIMIT") {
        if limit_idx + 1 < parts.len() {
            if let Ok(val) = parts[limit_idx + 1].parse::<i64>() {
                limit = val;
            }
        }
    }

    // Find OFFSET
    if let Some(offset_idx) = parts.iter().position(|p| p.to_uppercase() == "OFFSET") {
        if offset_idx + 1 < parts.len() {
            if let Ok(val) = parts[offset_idx + 1].parse::<i64>() {
                offset = val;
            }
        }
    }

    (collection_name, limit, offset)
}

/// Convert a BSON value to a display string
fn bson_value_to_string(value: &mongodb::bson::Bson) -> Option<String> {
    match value {
        mongodb::bson::Bson::Null => None,
        mongodb::bson::Bson::String(s) => Some(s.clone()),
        mongodb::bson::Bson::Double(f) => Some(format!("{}", f)),
        mongodb::bson::Bson::Int32(i) => Some(format!("{}", i)),
        mongodb::bson::Bson::Int64(i) => Some(format!("{}", i)),
        mongodb::bson::Bson::Boolean(b) => Some(format!("{}", b)),
        mongodb::bson::Bson::ObjectId(oid) => Some(format!("{}", oid)),
        mongodb::bson::Bson::DateTime(dt) => {
            Some(dt.to_rfc3339_string())
        }
        mongodb::bson::Bson::Array(arr) => {
            let str_arr: Vec<String> = arr.iter().filter_map(|v| bson_value_to_string(v)).collect();
            Some(format!("[{}]", str_arr.join(", ")))
        }
        mongodb::bson::Bson::Document(doc) => {
            // Serialize nested document as JSON string
            serde_json::to_string(&doc).ok()
        }
        mongodb::bson::Bson::Binary(bin) => {
            Some(format!("Binary({})", hex::encode(&bin.bytes)))
        }
        mongodb::bson::Bson::RegularExpression(regex) => {
            Some(format!("/{}/{}", regex.pattern, regex.options))
        }
        mongodb::bson::Bson::Timestamp(ts) => {
            Some(format!("Timestamp({}, {})", ts.time, ts.increment))
        }
        _ => {
            // Fallback: try to serialize as string
            Some(format!("{:?}", value))
        }
    }
}
