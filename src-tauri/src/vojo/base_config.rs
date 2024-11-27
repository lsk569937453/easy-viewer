use super::exe_sql_response::ExeSqlResponse;
use super::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use super::mysql_config::MysqlConfig;
use super::sqlite_config::SqliteConfig;
use crate::sql_lite::connection::AppState;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::postgresql_config::PostgresqlConfig;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::Ok;
use serde::Deserialize;
use serde::Serialize;
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
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let res = match self {
            BaseConfigEnum::Mysql(config) => config.get_description()?,
            BaseConfigEnum::Sqlite(config) => config.get_description()?,
            _ => "".to_string(),
        };
        Ok(res)
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
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let vec = match self {
            BaseConfigEnum::Mysql(config) => {
                config.list_node_info(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Postgresql(config) => config.list_node_info(list_node_info_req).await?,

            BaseConfigEnum::Sqlite(config) => {
                config.list_node_info(list_node_info_req, appstate).await?
            }
            _ => ListNodeInfoResponse::new_with_empty(),
        };
        Ok(vec)
    }
    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let vec = match self {
            BaseConfigEnum::Mysql(config) => {
                config
                    .get_column_info_for_is(list_node_info_req, appstate)
                    .await?
            }

            BaseConfigEnum::Sqlite(config) => {
                config
                    .get_column_info_for_is(list_node_info_req, appstate)
                    .await?
            }
            _ => GetColumnInfoForInsertSqlResponse::new(),
        };
        Ok(vec)
    }
    pub async fn remove_column(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        column_name: String,
    ) -> Result<(), anyhow::Error> {
        if let BaseConfigEnum::Mysql(config) = self {
            config
                .remove_column(list_node_info_req, appstate, column_name)
                .await?
        };
        Ok(())
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
    pub async fn dump_database_struct(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        if let BaseConfigEnum::Mysql(config) = self {
            config
                .dump_database_struct(list_node_info_req, appstate)
                .await?
        };
        Ok(())
    }
    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config.init_dump_data(list_node_info_req, appstate).await?
            }

            _ => InitDumpDataResponse::new(),
        };
        Ok(data)
    }
    pub async fn move_column(
        &self,
        appstate: &AppState,
        list_node_info_req: ListNodeInfoReq,
        move_direction: i32,
    ) -> Result<String, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config
                    .move_column(appstate, list_node_info_req, move_direction)
                    .await?
            }

            _ => "".to_string(),
        };
        Ok(data)
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config
                    .get_complete_words(list_node_info_req, appstate)
                    .await?
            }
            BaseConfigEnum::Postgresql(config) => {
                config
                    .get_complete_words(list_node_info_req, appstate)
                    .await?
            }
            BaseConfigEnum::Sqlite(config) => {
                config
                    .get_complete_words(list_node_info_req, appstate)
                    .await?
            }
            _ => vec![],
        };
        Ok(data)
    }
    pub async fn get_procedure_details(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config
                    .get_procedure_details(list_node_info_req, appstate)
                    .await?
            }

            _ => "vec![]".to_string(),
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
