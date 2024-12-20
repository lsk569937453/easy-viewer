use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use clickhouse::Client;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
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

impl ClickhouseConfig {
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let conn = self.get_connection().await?;
        let res = conn.query(&sql).fetch().await?;
        Ok(ExeSqlResponse::new())
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let _ = self.get_connection().await?;

        Ok(())
    }
    async fn get_connection(&self) -> Result<Client, anyhow::Error> {
        let url = format!("http://{}:{}", self.config.host, self.config.port);
        let client = Client::default()
            .with_url(url.clone())
            .with_user(self.config.user_name.clone())
            .with_password(self.config.password.clone())
            .with_product_info("easy-viewer", "1.0.0");
        info!("Clickhouse url: {}", url);
        let t = timeout(
            Duration::from_millis(500),
            client.query("SELECT 'Hello, World!'").fetch_one::<usize>(),
        )
        .await??;
        info!("Clickhouse url2: {}", t);

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
                let tables_count = conn.query(&sql).fetch_one::<i32>().await?;
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
                let db_name = level_infos[1].config_value.clone();
                let node_name = level_infos[2].config_value.clone();
                if node_name == "Tables" {
                    let list_table_sql = format!("SHOW TABLES FROM {}", db_name);
                    let conn = self.get_connection().await?;
                    let res: Vec<String> = conn.query(&list_table_sql).fetch_all().await?;
                    for table_name in res {
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "singleTable".to_string(),
                            table_name.clone(),
                            None,
                        );
                        // info!("schema name is:{}", schema_name);
                        vec.push(list_node_info_response_item);
                    }
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {}", level_infos.len());
            }
        }

        Ok(ListNodeInfoResponse::new(vec))
    }
}
