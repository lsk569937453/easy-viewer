use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use human_bytes::human_bytes;
use mongodb::bson::{Bson, Document};
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
    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let client = self.get_connection().await?;
        let level_infos = &list_node_info_req.level_infos;

        if level_infos.len() < 2 {
            return Err(anyhow!("Invalid level_infos for MongoDB update"));
        }

        let database_name = level_infos[1].config_value.clone();
        let database = client.database(&database_name);

        let mut errors = vec![];
        for sql in &sqls {
            info!("MongoDB SQL: {}", sql);
            let sql_upper = sql.to_uppercase();

            if sql_upper.starts_with("INSERT") {
                // Handle INSERT
                match parse_insert_sql(sql) {
                    Ok((collection_name, insert_doc)) => {
                        info!(
                            "MongoDB parsed insert: collection={}, doc={:?}",
                            collection_name, insert_doc
                        );
                        let collection: Collection<Document> = database.collection(&collection_name);
                        if let Err(e) = collection.insert_one(insert_doc).await {
                            errors.push(format!("MongoDB insert error: {}", e));
                        }
                    }
                    Err(e) => {
                        errors.push(format!("Failed to parse INSERT SQL '{}': {}", sql, e));
                    }
                }
            } else {
                // Handle UPDATE
                match parse_update_sql(sql) {
                    Ok((collection_name, filter_doc, update_doc)) => {
                        info!(
                            "MongoDB parsed update: collection={}, filter={:?}, update={:?}",
                            collection_name, filter_doc, update_doc
                        );
                        let collection: Collection<Document> = database.collection(&collection_name);
                        match collection.update_one(filter_doc.clone(), update_doc.clone()).await {
                            Ok(result) => {
                                info!(
                                    "MongoDB update result: matched_count={}, modified_count={}",
                                    result.matched_count, result.modified_count
                                );
                                if result.matched_count == 0 {
                                    // If _id filter used ObjectId but didn't match, retry with String type
                                    if let Some(id_value) = filter_doc.get("_id") {
                                        if let Bson::ObjectId(oid) = id_value {
                                            info!("Retrying _id as String instead of ObjectId");
                                            let mut retry_filter = filter_doc.clone();
                                            retry_filter.insert("_id", oid.to_hex());
                                            match collection.update_one(retry_filter, update_doc).await {
                                                Ok(retry_result) => {
                                                    info!(
                                                        "MongoDB retry update result: matched_count={}, modified_count={}",
                                                        retry_result.matched_count, retry_result.modified_count
                                                    );
                                                    if retry_result.matched_count == 0 {
                                                        errors.push(format!(
                                                            "No document matched the filter for: {}",
                                                            sql
                                                        ));
                                                    }
                                                }
                                                Err(e) => {
                                                    errors.push(format!("MongoDB update error: {}", e));
                                                }
                                            }
                                        } else {
                                            errors.push(format!(
                                                "No document matched the filter for: {}",
                                                sql
                                            ));
                                        }
                                    } else {
                                        errors.push(format!(
                                            "No document matched the filter for: {}",
                                            sql
                                        ));
                                    }
                                }
                            }
                            Err(e) => {
                                errors.push(format!("MongoDB update error: {}", e));
                            }
                        }
                    }
                    Err(e) => {
                        errors.push(format!("Failed to parse SQL '{}': {}", sql, e));
                    }
                }
            }
        }

        if !errors.is_empty() {
            return Err(anyhow!(errors.join("; ")));
        }

        Ok(())
    }
    pub async fn delete_table_row(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        table_name: String,
        row_id: String,
    ) -> Result<(), anyhow::Error> {
        let client = self.get_connection().await?;
        let level_infos = &list_node_info_req.level_infos;

        if level_infos.len() < 2 {
            return Err(anyhow!("Invalid level_infos for MongoDB delete"));
        }

        let database_name = level_infos[1].config_value.clone();
        let database = client.database(&database_name);
        let collection: Collection<Document> = database.collection(&table_name);

        // Try ObjectId first, then fall back to String
        let mut filter_doc = Document::new();
        if let Ok(oid) = mongodb::bson::oid::ObjectId::parse_str(&row_id) {
            filter_doc.insert("_id", oid);
        } else {
            filter_doc.insert("_id", row_id.as_str());
        }

        info!("MongoDB delete: collection={}, filter={:?}", table_name, filter_doc);

        let result = collection.delete_one(filter_doc.clone()).await?;
        info!("MongoDB delete result: deleted_count={}", result.deleted_count);

        if result.deleted_count == 0 {
            // Retry with String type _id if ObjectId didn't match
            let mut retry_filter = Document::new();
            retry_filter.insert("_id", row_id.as_str());
            info!("MongoDB delete retry with String _id: {:?}", retry_filter);
            let retry_result = collection.delete_one(retry_filter).await?;
            info!("MongoDB delete retry result: deleted_count={}", retry_result.deleted_count);

            if retry_result.deleted_count == 0 {
                return Err(anyhow!("No document matched for deletion with _id={}", row_id));
            }
        }

        Ok(())
    }
    pub async fn create_collection(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        collection_name: String,
    ) -> Result<(), anyhow::Error> {
        let client = self.get_connection().await?;
        let level_infos = &list_node_info_req.level_infos;

        if level_infos.len() < 2 {
            return Err(anyhow!("Invalid level_infos for MongoDB create_collection"));
        }

        let database_name = level_infos[1].config_value.clone();
        let database = client.database(&database_name);

        info!(
            "MongoDB create_collection: database={}, collection={}",
            database_name, collection_name
        );

        database
            .create_collection(&collection_name)
            .await
            .map_err(|e| anyhow!("Failed to create collection: {}", e))?;

        Ok(())
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

/// Parse a SQL INSERT statement into a MongoDB collection name and document.
/// Expected format: INSERT INTO `collection` (`field1`, `field2`) VALUES ('value1', 'value2')
fn parse_insert_sql(sql: &str) -> Result<(String, Document), anyhow::Error> {
    let sql_upper = sql.to_uppercase();

    // Find "INTO" keyword and extract collection name
    let into_pos = sql_upper
        .find("INTO")
        .ok_or_else(|| anyhow!("No INTO clause found in INSERT SQL"))?;
    let paren_open = sql
        .find('(')
        .ok_or_else(|| anyhow!("No opening parenthesis found in INSERT SQL"))?;

    let collection_part = sql[into_pos + 4..paren_open].trim();
    let collection_name = collection_part.trim_matches('`').to_string();

    // Extract column names between first pair of parentheses
    let paren_close = sql[paren_open..]
        .find(')')
        .ok_or_else(|| anyhow!("No closing parenthesis for columns in INSERT SQL"))?
        + paren_open;
    let columns_str = &sql[paren_open + 1..paren_close];
    let columns: Vec<&str> = columns_str
        .split(',')
        .map(|c| c.trim().trim_matches('`'))
        .collect();

    // Extract values after "VALUES"
    let values_pos = sql_upper
        .find("VALUES")
        .ok_or_else(|| anyhow!("No VALUES clause found in INSERT SQL"))?;
    let values_str = &sql[values_pos + 6..].trim();
    // Remove surrounding parentheses
    let values_str = values_str
        .trim()
        .strip_prefix('(')
        .and_then(|s| s.strip_suffix(')'))
        .ok_or_else(|| anyhow!("VALUES must be enclosed in parentheses"))?;

    let values = parse_values_list(values_str);

    if columns.len() != values.len() {
        return Err(anyhow!(
            "Column count ({}) does not match value count ({})",
            columns.len(),
            values.len()
        ));
    }

    let mut doc = Document::new();
    for (col, val) in columns.iter().zip(values.iter()) {
        doc.insert(col.to_string(), val.clone());
    }

    Ok((collection_name, doc))
}

/// Parse a comma-separated VALUES list, respecting quoted strings.
fn parse_values_list(values_str: &str) -> Vec<Bson> {
    let mut values = Vec::new();
    let mut current = String::new();
    let mut in_quote = false;
    let mut quote_char = '\0';

    for ch in values_str.chars() {
        if in_quote {
            if ch == quote_char {
                in_quote = false;
            } else {
                current.push(ch);
            }
        } else if ch == '\'' || ch == '"' {
            in_quote = true;
            quote_char = ch;
        } else if ch == ',' {
            values.push(parse_sql_value_to_bson(current.trim()));
            current.clear();
        } else {
            current.push(ch);
        }
    }
    if !current.trim().is_empty() {
        values.push(parse_sql_value_to_bson(current.trim()));
    }

    values
}

/// Parse a SQL UPDATE statement into MongoDB filter and update documents.
/// Expected format: UPDATE `collection` SET `field1` = 'value1', `field2` = NULL WHERE `_id` = 'id_value'
fn parse_update_sql(
    sql: &str,
) -> Result<(String, Document, Document), anyhow::Error> {
    // Extract collection name: text between "UPDATE" and "SET"
    let sql_upper = sql.to_uppercase();
    let set_pos = sql_upper
        .find("SET")
        .ok_or_else(|| anyhow!("No SET clause found in UPDATE SQL"))?;
    let update_pos = sql_upper
        .find("UPDATE")
        .ok_or_else(|| anyhow!("Not an UPDATE SQL statement"))?;

    let collection_part = sql[update_pos + 6..set_pos].trim();
    let collection_name = collection_part.trim_matches('`').to_string();

    // Extract the part between SET and WHERE
    let where_pos = sql_upper
        .find("WHERE")
        .ok_or_else(|| anyhow!("No WHERE clause found in UPDATE SQL"))?;

    let set_clause = sql[set_pos + 3..where_pos].trim();
    let where_clause = sql[where_pos + 5..].trim();

    // Parse SET clause: `field1` = 'value1', `field2` = 'value2'
    let mut update_fields = Document::new();
    for pair in set_clause.split(',') {
        let pair = pair.trim();
        if pair.is_empty() {
            continue;
        }
        let eq_pos = pair
            .find('=')
            .ok_or_else(|| anyhow!("No '=' found in SET clause: {}", pair))?;
        let field = pair[..eq_pos].trim().trim_matches('`').to_string();
        let value_str = pair[eq_pos + 1..].trim();

        let bson_value = parse_sql_value_to_bson(value_str);
        update_fields.insert(field, bson_value);
    }

    // Parse WHERE clause: `_id` = 'value'
    let eq_pos = where_clause
        .find('=')
        .ok_or_else(|| anyhow!("No '=' found in WHERE clause: {}", where_clause))?;
    let filter_field = where_clause[..eq_pos].trim().trim_matches('`').to_string();
    let filter_value_str = where_clause[eq_pos + 1..].trim();
    let filter_bson_value = if filter_field == "_id" {
        parse_id_value_to_bson(filter_value_str)
    } else {
        parse_sql_value_to_bson(filter_value_str)
    };

    let mut filter_doc = Document::new();
    filter_doc.insert(filter_field, filter_bson_value);

    // Build MongoDB update document with $set operator
    let mut update_doc = Document::new();
    update_doc.insert("$set", update_fields);

    Ok((collection_name, filter_doc, update_doc))
}

/// Parse a value string that is known to be an _id field.
/// Tries ObjectId first (24-char hex string), then falls back to normal value parsing.
fn parse_id_value_to_bson(value_str: &str) -> Bson {
    let trimmed = value_str.trim();

    // Extract inner value if quoted
    let inner = if (trimmed.starts_with('\'') && trimmed.ends_with('\''))
        || (trimmed.starts_with('"') && trimmed.ends_with('"'))
    {
        &trimmed[1..trimmed.len() - 1]
    } else {
        trimmed
    };

    // Try to parse as ObjectId (24-character hex string)
    if inner.len() == 24 && inner.chars().all(|c| c.is_ascii_hexdigit()) {
        if let Ok(oid) = mongodb::bson::oid::ObjectId::parse_str(inner) {
            return Bson::ObjectId(oid);
        }
    }

    // Fallback to normal parsing
    parse_sql_value_to_bson(value_str)
}

/// Parse a SQL value string into a BSON value.
/// Handles: 'string', NULL, numbers, booleans
fn parse_sql_value_to_bson(value_str: &str) -> Bson {
    let trimmed = value_str.trim();

    if trimmed.eq_ignore_ascii_case("NULL") {
        return Bson::Null;
    }

    // Quoted string value: 'value' or '''value'''
    if (trimmed.starts_with('\'') && trimmed.ends_with('\''))
        || (trimmed.starts_with('"') && trimmed.ends_with('"'))
    {
        let quote_char = trimmed.chars().next().unwrap();
        // Remove surrounding quotes
        let inner = &trimmed[1..trimmed.len() - 1];
        // Unescape doubled quotes (e.g., '' -> ')
        let unescaped = inner.replace(&format!("{}{}", quote_char, quote_char), &quote_char.to_string());
        return Bson::String(unescaped);
    }

    // Boolean
    if trimmed.eq_ignore_ascii_case("true") {
        return Bson::Boolean(true);
    }
    if trimmed.eq_ignore_ascii_case("false") {
        return Bson::Boolean(false);
    }

    // Try integer
    if let Ok(i) = trimmed.parse::<i64>() {
        return Bson::Int64(i);
    }

    // Try float
    if let Ok(f) = trimmed.parse::<f64>() {
        return Bson::Double(f);
    }

    // Fallback: treat as string
    Bson::String(trimmed.to_string())
}
