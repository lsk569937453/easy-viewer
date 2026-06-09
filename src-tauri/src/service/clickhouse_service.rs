use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use clickhouse::Client;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Row;
use std::collections::BTreeMap;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::time::timeout;
static CLICKHOUSE_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> =
    OnceLock::new();

fn get_clickhouse_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    CLICKHOUSE_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct ClickhouseConfig {
    pub config: DatabaseHostStruct,
}

/// Wrapper for ClickHouse JSON response format
#[derive(Debug, Deserialize)]
struct ClickhouseJsonResponse {
    meta: Vec<ClickhouseMeta>,
    data: Vec<BTreeMap<String, serde_json::Value>>,
}

#[derive(Debug, Deserialize)]
struct ClickhouseMeta {
    name: String,
}

impl ClickhouseConfig {
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        // Qualify table name with database if needed
        let level_infos = &list_node_info_req.level_infos;
        let actual_sql = if level_infos.len() >= 2 {
            let db_name = level_infos[1].config_value.clone();
            qualify_sql_with_database(&sql, &db_name)
        } else {
            sql.clone()
        };

        info!("ClickHouse exe_sql: {}", actual_sql);

        // Use ClickHouse HTTP interface directly with FORMAT JSON
        let json_sql = format!("{} FORMAT JSON", actual_sql.trim_end_matches(';').trim());

        let url = format!("http://{}:{}", self.config.host, self.config.port);

        let mut request = reqwest::Client::new()
            .post(&url)
            .body(json_sql)
            .header("Content-Type", "application/x-www-form-urlencoded");

        if !self.config.user_name.is_empty() {
            request = request.basic_auth(&self.config.user_name, Some(&self.config.password));
        }

        let response = request.send().await?;
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("ClickHouse HTTP error {}: {}", status, error_text));
        }

        let raw_json = response.text().await?;
        let ch_response: ClickhouseJsonResponse =
            serde_json::from_str(&raw_json).map_err(|e| anyhow!("Failed to parse JSON: {:?}", e))?;

        // Build headers from meta
        let headers: Vec<Header> = ch_response
            .meta
            .iter()
            .map(|m| Header {
                name: m.name.clone(),
                type_name: "String".to_string(),
                is_primary_key: false,
            })
            .collect();

        let field_names: Vec<String> = headers.iter().map(|h| h.name.clone()).collect();

        // Build rows
        let mut rows: Vec<Vec<Option<String>>> = Vec::new();
        for row in &ch_response.data {
            let mut row_vec: Vec<Option<String>> = Vec::new();
            for field_name in &field_names {
                let cell = row
                    .get(field_name)
                    .and_then(|v| json_value_to_string(v));
                row_vec.push(cell);
            }
            rows.push(row_vec);
        }

        Ok(ExeSqlResponse::from(headers, rows, None))
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let _ = self.get_connection().await?;
        Ok(())
    }

    /// Get a basic client for queries (does not test connection)
    async fn get_connection_for_query(&self) -> Result<Client, anyhow::Error> {
        let url = format!("http://{}:{}", self.config.host, self.config.port);
        let client = Client::default()
            .with_url(url.clone())
            .with_user(self.config.user_name.clone())
            .with_password(self.config.password.clone());
        if let Some(ref db) = self.config.database {
            if !db.is_empty() {
                info!("ClickHouse using database: {}", db);
                return Ok(client.with_database(db));
            }
        }
        Ok(client)
    }

    async fn get_connection(&self) -> Result<Client, anyhow::Error> {
        let client = self.get_connection_for_query().await?;
        let t = timeout(
            Duration::from_millis(500),
            client.query("SELECT 1").fetch_one::<u8>(),
        )
        .await??;
        info!("Clickhouse connection test: {}", t);
        Ok(client)
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];
        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let conn = self.get_connection().await?;
                let get_database_sql = "SELECT name
FROM system.databases
WHERE name != 'information_schema' and name != 'INFORMATION_SCHEMA'";
                info!("get_database_sql: {}", get_database_sql);
                let res: Vec<String> = conn.query(get_database_sql).fetch_all().await?;
                for db_name in res {
                    info!("db_name: {}", db_name);
                    let show_size_sql = format!(
                        "SELECT
    database AS database_name,
    formatReadableSize(SUM(bytes_on_disk)) AS database_size
FROM system.parts
WHERE database = '{}'
GROUP BY database LIMIT 100",
                        db_name
                    );
                    let res = conn
                        .query(&show_size_sql)
                        .fetch_optional::<(String, String)>()
                        .await?
                        .map(|item| item.1);
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "database".to_string(),
                        db_name,
                        res,
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            2 => {
                let db_name = level_infos[1].config_value.clone();

                let conn = self.get_connection().await?;
                let sql = format!(
                    "SELECT COUNT(*) AS table_count
FROM system.tables
WHERE database = '{}'",
                    db_name
                );
                let tables_count = conn.query(&sql).fetch_one::<u64>().await?;
                for (name, icon_name) in get_clickhouse_database_data().iter() {
                    let description = if *name == "Tables" && tables_count > 0 {
                        Some(format!("({})", tables_count))
                    } else {
                        None
                    };
                    info!("description: {}", tables_count);
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
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let db_name = level_infos[1].config_value.clone();
                let node_name = level_infos[2].config_value.clone();
                if node_name == "Tables" {
                    let list_table_sql = format!("SHOW TABLES FROM {}", db_name);
                    let conn = self.get_connection().await?;
                    let res: Vec<String> = conn.query(&list_table_sql).fetch_all().await?;
                    let row_count_sql = format!(
                        "SELECT name, total_rows FROM system.tables WHERE database = '{}'",
                        db_name
                    );
                    let row_counts: Vec<(String, Option<u64>)> =
                        conn.query(&row_count_sql).fetch_all().await?;
                    let row_count_map: std::collections::HashMap<String, Option<u64>> =
                        row_counts.into_iter().collect();
                    for table_name in res {
                        let description = row_count_map
                            .get(&table_name)
                            .and_then(|opt| *opt)
                            .and_then(|count| {
                                if count > 0 {
                                    Some(format!("({})", count))
                                } else {
                                    None
                                }
                            });
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "singleTable".to_string(),
                            table_name.clone(),
                            description,
                        );
                        vec.push(list_node_info_response_item);
                    }
                } else if node_name == "Query" {
                    let rows =
                        sqlx::query("select query_name from sql_query where connection_id=?1 and database_name=?2")
                            .bind(base_config_id)
                            .bind(&db_name)
                            .fetch_all(&appstate.pool)
                            .await?;
                    let mut vec = vec![];
                    for row in rows {
                        let row_str: String = row.try_get(0)?;
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singleQuery".to_string(),
                            row_str,
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    return Ok(ListNodeInfoResponse::new(vec));
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {}", level_infos.len());
            }
        }

        Ok(ListNodeInfoResponse::new(vec))
    }

    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let url = format!("http://{}:{}", self.config.host, self.config.port);
        let sql = "SELECT version() FORMAT JSON";

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(1))
            .build()?;
        let mut request = client
            .post(&url)
            .body(sql)
            .header("Content-Type", "application/x-www-form-urlencoded");

        if !self.config.user_name.is_empty() {
            request = request.basic_auth(&self.config.user_name, Some(&self.config.password));
        }

        let response = request.send().await?;
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("ClickHouse HTTP error {}: {}", status, error_text));
        }

        let raw_json = response.text().await?;
        let ch_response: ClickhouseJsonResponse =
            serde_json::from_str(&raw_json).map_err(|e| anyhow!("Failed to parse JSON: {:?}", e))?;

        let version = ch_response
            .data
            .first()
            .and_then(|row| row.get("version()"))
            .and_then(|v| json_value_to_string(v))
            .ok_or_else(|| anyhow!("No version found in ClickHouse response"))?;

        Ok(version)
    }

    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let level_infos = &list_node_info_req.level_infos;
        if level_infos.len() < 2 {
            return Err(anyhow!("Invalid level_infos for ClickHouse update"));
        }

        let db_name = level_infos[1].config_value.clone();
        let url = format!(
            "http://{}:{}?database={}",
            self.config.host, self.config.port, db_name
        );

        let mut errors = vec![];
        for sql in &sqls {
            // Convert standard UPDATE to ClickHouse ALTER TABLE ... UPDATE syntax
            let ch_sql = convert_update_to_clickhouse_syntax(sql, &db_name);
            info!("ClickHouse update SQL: {}", ch_sql);

            let mut request = reqwest::Client::new()
                .post(&url)
                .body(ch_sql)
                .header("Content-Type", "application/x-www-form-urlencoded");

            if !self.config.user_name.is_empty() {
                request = request.basic_auth(&self.config.user_name, Some(&self.config.password));
            }

            match request.send().await {
                Ok(response) => {
                    let status = response.status();
                    if !status.is_success() {
                        let error_text = response.text().await.unwrap_or_default();
                        errors.push(format!("ClickHouse HTTP error {}: {}", status, error_text));
                    }
                }
                Err(e) => {
                    errors.push(format!("ClickHouse request error: {}", e));
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
        id_column: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = &list_node_info_req.level_infos;
        if level_infos.len() < 2 {
            return Err(anyhow!("Invalid level_infos for ClickHouse delete"));
        }

        let db_name = level_infos[1].config_value.clone();
        let url = format!(
            "http://{}:{}?database={}",
            self.config.host, self.config.port, db_name
        );

        // ClickHouse uses ALTER TABLE ... DELETE WHERE syntax
        let sql = format!(
            "ALTER TABLE `{}`.`{}` DELETE WHERE `{}` = '{}'",
            db_name, table_name, id_column, row_id.replace('\'', "''")
        );
        info!("ClickHouse delete SQL: {}", sql);

        let mut request = reqwest::Client::new()
            .post(&url)
            .body(sql)
            .header("Content-Type", "application/x-www-form-urlencoded");

        if !self.config.user_name.is_empty() {
            request = request.basic_auth(&self.config.user_name, Some(&self.config.password));
        }

        let response = request.send().await?;
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("ClickHouse delete error {}: {}", status, error_text));
        }

        Ok(())
    }

    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = &list_node_info_req.level_infos;
        if level_infos.len() < 4 {
            return Err(anyhow!("Invalid level_infos for ClickHouse get_ddl"));
        }

        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();

        let sql = format!(
            "SHOW CREATE TABLE `{}`.`{}` FORMAT JSON",
            database_name, table_name
        );
        info!("ClickHouse get_ddl: {}", sql);

        let url = format!("http://{}:{}", self.config.host, self.config.port);

        let mut request = reqwest::Client::new()
            .post(&url)
            .body(sql)
            .header("Content-Type", "application/x-www-form-urlencoded");

        if !self.config.user_name.is_empty() {
            request = request.basic_auth(&self.config.user_name, Some(&self.config.password));
        }

        let response = request.send().await?;
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("ClickHouse HTTP error {}: {}", status, error_text));
        }

        let raw_json = response.text().await?;
        let ch_response: ClickhouseJsonResponse =
            serde_json::from_str(&raw_json).map_err(|e| anyhow!("Failed to parse JSON: {:?}", e))?;

        // SHOW CREATE TABLE returns a single row with a "statement" column
        let ddl = ch_response
            .data
            .first()
            .and_then(|row| row.get("statement"))
            .and_then(|v| json_value_to_string(v))
            .ok_or_else(|| anyhow!("No DDL found in response"))?;

        Ok(ddl)
    }
}

/// Qualify a simple "SELECT * FROM table" with the database name: "SELECT * FROM db.table"
fn qualify_sql_with_database(sql: &str, db_name: &str) -> String {
    let parts: Vec<&str> = sql.split_whitespace().collect();
    if let Some(from_idx) = parts.iter().position(|p| p.to_uppercase() == "FROM") {
        if from_idx + 1 < parts.len() {
            let table_name = parts[from_idx + 1].trim_matches('`');
            if !table_name.contains('.') {
                let qualified = format!("`{}`.`{}`", db_name, table_name);
                let mut result = String::new();
                for (i, part) in parts.iter().enumerate() {
                    if i == from_idx + 1 {
                        result.push_str(&qualified);
                    } else {
                        result.push_str(part);
                    }
                    if i < parts.len() - 1 {
                        result.push(' ');
                    }
                }
                return result;
            }
        }
    }
    sql.to_string()
}

/// Convert standard UPDATE SQL to ClickHouse ALTER TABLE ... UPDATE syntax.
/// Input:  UPDATE `table` SET `col` = 'val' WHERE `id` = 'val'
/// Output: ALTER TABLE `db`.`table` UPDATE `col` = 'val' WHERE `id` = 'val'
fn convert_update_to_clickhouse_syntax(sql: &str, db_name: &str) -> String {
    let sql_upper = sql.to_uppercase();

    if !sql_upper.starts_with("UPDATE") {
        // Not an UPDATE, qualify as-is
        return qualify_sql_with_database(sql, db_name);
    }

    // Find SET and WHERE positions
    let set_pos = match sql_upper.find("SET") {
        Some(p) => p,
        None => return qualify_sql_with_database(sql, db_name),
    };
    let where_pos = match sql_upper.find("WHERE") {
        Some(p) => p,
        None => return qualify_sql_with_database(sql, db_name),
    };

    // Extract table name between UPDATE and SET
    let table_part = sql[6..set_pos].trim();
    let table_name = table_part.trim_matches('`');

    // Qualify table name with database
    let qualified_table = format!("`{}`.`{}`", db_name, table_name);

    // Extract the SET ... WHERE part
    let set_where_part = &sql[set_pos..where_pos];
    let where_part = &sql[where_pos..];

    // Build ClickHouse ALTER TABLE ... UPDATE syntax
    format!("ALTER TABLE {} UPDATE {} {}", qualified_table, set_where_part.trim_start_matches("SET").trim(), where_part)
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
        serde_json::Value::Object(obj) => serde_json::to_string(obj).ok(),
    }
}
