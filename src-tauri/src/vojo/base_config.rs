use crate::sql_lite::connection::AppState;
use anyhow::Ok;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;

use super::list_node_info_req::ListNodeInfoReq;
#[derive(Deserialize, Serialize)]
pub enum BaseConfigEnum {
    #[serde(rename = "mysql")]
    Mysql(MysqlConfig),
    #[serde(rename = "postgresql")]
    Postgresql(PostgresqlConfig),
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
            _ => {}
        }

        Ok(())
    }
    pub fn get_connection_type(&self) -> i32 {
        match self {
            BaseConfigEnum::Mysql(_) => 0,
            BaseConfigEnum::Postgresql(_) => 1,
            BaseConfigEnum::Kafka(_) => 2,
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
            _ => vec![("".to_string(), "".to_string())],
        };
        Ok(vec)
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct KafkaConfig {
    pub broker: String,
    pub topic: String,
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MysqlConfig {
    pub config: DatabaseHostStruct,
}
impl MysqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mysql".to_string());
        MySqlConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let mut vec = vec![];
        let connection_url = self.config.to_url("mysql".to_string());

        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let mut conn = MySqlConnection::connect(&connection_url).await?;

                let rows = sqlx::query(
                    "SELECT `schema_name`
from INFORMATION_SCHEMA.SCHEMATA
WHERE
    `schema_name` NOT IN(
        'information_schema',
        'mysql',
        'performance_schema'
    );",
                )
                .fetch_all(&mut conn)
                .await?;

                for item in rows {
                    let buf: &[u8] = item.try_get(0)?;
                    vec.push((
                        String::from_utf8_lossy(buf).to_string(),
                        "database".to_string(),
                    ));
                }
                info!("list_node_info: {:?}", vec);
                return Ok(vec);
            }
            2 => {}
            3 => {
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let database_name = level_infos[1].config_value.clone();
                let node_name = level_infos[2].config_value.clone();
                if node_name == "Tables" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;

                    let sql = format!("use {}", database_name);
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;

                    let rows = sqlx::query("SHOW tables").fetch_all(&mut conn).await?;
                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        vec.push((
                            String::from_utf8_lossy(buf).to_string(),
                            "singleTable".to_string(),
                        ));
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(vec);
                }
            }
            4 => {}
            5 => {
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let database_name = level_infos[1].config_value.clone();
                let table_name = level_infos[3].config_value.clone();
                let node_name = level_infos[4].config_value.clone();

                if node_name == "Columns" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;
                    let mut sql = format!("use {}", database_name);
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    sql = format!("describe {};", table_name);
                    info!("sql: {}", sql);
                    let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        let key: &[u8] = item.try_get(3)?;
                        info!("key: {}", String::from_utf8_lossy(key).to_string());
                        if key == b"PRI" {
                            vec.push((
                                String::from_utf8_lossy(buf).to_string(),
                                "primary".to_string(),
                            ));
                        } else {
                            vec.push((
                                String::from_utf8_lossy(buf).to_string(),
                                "column".to_string(),
                            ));
                        }
                    }
                }
            }

            _ => {}
        }

        Ok(vec)
    }
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
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DatabaseHostStruct {
    pub host: String,
    pub database: String,
    pub user_name: String,
    pub password: String,
    pub port: i32,
}
impl DatabaseHostStruct {
    pub fn to_url(&self, protocol_name: String) -> String {
        format!(
            "{}://{}:{}@{}:{}/{}",
            protocol_name, self.user_name, self.password, self.host, self.port, self.database
        )
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
