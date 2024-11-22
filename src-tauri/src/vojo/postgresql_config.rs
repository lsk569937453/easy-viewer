use super::exe_sql_response::ExeSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use crate::sql_lite::connection::AppState;
use crate::vojo::base_config::DatabaseHostStruct;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::Ok;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Connection;
use sqlx::MySqlConnection;
use tokio_postgres::NoTls;
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
        MySqlConnection::connect(&test_url).await.map(|_| ())?;
        let (client, connection) = tokio_postgres::connect(&test_url, NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("connection error: {}", e);
            }
        });

        // Now we can execute a simple statement that just returns its parameter.
        let rows = client.query("SELECT $1::TEXT", &[&"hello world"]).await?;

        // And then check that we got back the same string we sent over.
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
        let test_url = self.config.to_url("mysql".to_string());
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
