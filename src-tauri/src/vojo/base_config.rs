use super::exe_sql_response::ExeSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use super::mysql_config::MysqlConfig;
use super::sqlite_config::SqliteConfig;
use crate::sql_lite::connection::AppState;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::Ok;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Connection;
use sqlx::MySqlConnection;
#[derive(Deserialize, Serialize)]
pub enum BaseConfigEnum {
    #[serde(rename = "mysql")]
    Mysql(MysqlConfig),
    #[serde(rename = "postgresql")]
    Postgresql(PostgresqlConfig),
    #[serde(rename = "sqlite")]
    Sqlite(SqliteConfig),
    #[serde(rename = "kafka")]
    Kafka(KafkaConfig),
}
impl BaseConfigEnum {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        match self {
            BaseConfigEnum::Mysql(config) => {
                config.test_connection().await?;
            }
            BaseConfigEnum::Postgresql(config) => config.test_connection().await?,
            BaseConfigEnum::Sqlite(config) => config.test_connection().await?,

            _ => {}
        }

        Ok(())
    }
    pub fn get_connection_type(&self) -> i32 {
        match self {
            BaseConfigEnum::Mysql(_) => 0,
            BaseConfigEnum::Postgresql(_) => 1,
            BaseConfigEnum::Kafka(_) => 2,
            BaseConfigEnum::Sqlite(_) => 3,
        }
    }
    pub async fn list_node_info(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let vec = match self {
            BaseConfigEnum::Mysql(config) => {
                config.list_node_info(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Postgresql(config) => config.list_node_info(list_node_info_req).await?,

            BaseConfigEnum::Sqlite(config) => config.list_node_info(list_node_info_req).await?,
            _ => vec![("".to_string(), "".to_string())],
        };
        Ok(vec)
    }

    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config.exe_sql(list_node_info_req, appstate, sql).await?
            }
            BaseConfigEnum::Postgresql(config) => {
                config.exe_sql(list_node_info_req, appstate, sql).await?
            }
            BaseConfigEnum::Sqlite(config) => {
                config.exe_sql(list_node_info_req, appstate, sql).await?
            }
            _ => ExeSqlResponse::new(),
        };
        Ok(data)
    }
    pub async fn update_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        match self {
            BaseConfigEnum::Mysql(config) => {
                config.update_sql(list_node_info_req, appstate, sql).await?
            }

            BaseConfigEnum::Sqlite(config) => {
                config.update_sql(list_node_info_req, appstate, sql).await?
            }
            _ => (),
        };
        Ok(())
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config.show_columns(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Postgresql(config) => {
                config.show_columns(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Sqlite(config) => {
                config.show_columns(list_node_info_req, appstate).await?
            }
            _ => ShowColumnsResponse::new(),
        };
        Ok(data)
    }
    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => config.get_ddl(list_node_info_req, appstate).await?,

            BaseConfigEnum::Sqlite(config) => config.get_ddl(list_node_info_req, appstate).await?,
            _ => "ExeSqlResponse::new()".to_string(),
        };
        Ok(data)
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct KafkaConfig {
    pub broker: String,
    pub topic: String,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct PostgresqlConfig {
    pub config: DatabaseHostStruct,
}
impl PostgresqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mysql".to_string());
        MySqlConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let vec = vec![];
        let test_url = self.config.to_url("mysql".to_string());
        Ok(vec)
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
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DatabaseHostStruct {
    pub host: String,
    pub database: Option<String>,
    pub user_name: String,
    pub password: String,
    pub port: i32,
}
impl DatabaseHostStruct {
    pub fn to_url(&self, protocol_name: String) -> String {
        if let Some(database) = &self.database {
            format!(
                "{}://{}:{}@{}:{}/{}",
                protocol_name, self.user_name, self.password, self.host, self.port, database
            )
        } else {
            format!(
                "{}://{}:{}@{}:{}",
                protocol_name, self.user_name, self.password, self.host, self.port
            )
        }
    }
}
#[derive(Deserialize, Serialize)]
pub struct BaseConfig {
    pub base_config_enum: BaseConfigEnum,
}

#[test]
fn test_host() -> Result<(), anyhow::Error> {
    Ok(())
}
