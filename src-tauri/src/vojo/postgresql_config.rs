use super::exe_sql_response::ExeSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use crate::sql_lite::connection::AppState;
use crate::vojo::base_config::DatabaseHostStruct;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::Ok;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use std::sync::OnceLock;
use tokio_postgres::NoTls;
static POSTGRESQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> =
    OnceLock::new();
static POSTGRESQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_postgresql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    POSTGRESQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
fn get_postgresql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    POSTGRESQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map.insert("Partitions", "partitions");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct PostgresqlConfig {
    pub config: DatabaseHostStruct,
}
impl PostgresqlConfig {
    fn connection_url(&self) -> String {
        format!(
            "host={} user={} password={}",
            self.config.host, self.config.user_name, self.config.password
        )
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.connection_url();
        info!("test_url: {}", test_url);
        let (client, connection) = tokio_postgres::connect(&test_url, NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                error!("connection error: {}", e);
            }
        });

        let rows = client.query("SELECT $1::TEXT", &[&"hello world"]).await?;

        let value: &str = rows[0].get(0);
        ensure!(
            value == "hello world",
            "expected 'hello world' but got {}",
            value
        );

        Ok(())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];

        let test_url = self.connection_url();
        info!("test_url: {}", test_url);
        let (client, connection) = tokio_postgres::connect(&test_url, NoTls).await?;
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                error!("connection error: {}", e);
            }
        });
        if list_node_info_req.level_infos.len() == 1 {
            let rows = client
                .query(
                    "SELECT datname FROM pg_database WHERE datistemplate = false;",
                    &[],
                )
                .await?;
            if rows.is_empty() {
                return Ok(ListNodeInfoResponse::new_with_empty());
            }
            for item in rows.iter() {
                let database_name: String = item.try_get(0)?;
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "database".to_string(),
                    database_name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            }
            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 2 {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                "public".to_string(),
                "public".to_string(),
                None,
            );
            vec.push(list_node_info_response_item);
            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 3 {
            for (name, icon_name) in get_postgresql_database_data().iter() {
                // let description = if *name == "Tables" && tables_count > 0 {
                //     Some(format!("({})", tables_count))
                // } else {
                //     None
                // };
                // info!("description: {}", tables_count);
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    icon_name.to_string(),
                    name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            }
            return Ok(ListNodeInfoResponse::new(vec));
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());

        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let node_name = level_infos[2].config_value.clone();
        Ok(ExeSqlResponse::new())
    }
    pub async fn update_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: Vec<String>,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());

        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let node_name = level_infos[2].config_value.clone();
        Ok(ExeSqlResponse::new())
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        Ok(ShowColumnsResponse::new())
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        Ok(vec![])
    }
}
