use std::default;

use crate::vojo::static_connections::Connections;
use serde::Deserialize;
use serde::Serialize;
use serde_repr::{Deserialize_repr, Serialize_repr};
use sqlx::Database;
use sqlx::Pool;
use tauri::State;
#[derive(Serialize_repr, Deserialize_repr, Clone, Default)]
#[repr(u8)]
pub enum DateBaseType {
    #[default]
    Mysql = 0,
    Sqlite = 1,
    Postgresql = 2,
}
impl DateBaseType {
    pub fn protocal(&self) -> String {
        match self {
            DateBaseType::Mysql => "mysql".to_string(),
            DateBaseType::Sqlite => "sqlite".to_string(),
            DateBaseType::Postgresql => "postgres".to_string(),
        }
    }
}
#[derive(Deserialize, Serialize, Default)]
pub struct BaseConfig {
    pub base_config_enum: BaseConfigEnum,
    pub base_config_kind: ConfigKind,
}
impl BaseConfig {
    pub fn is_database(&self) -> bool {
        let base_config_enum = &self.base_config_enum;
        match base_config_enum {
            BaseConfigEnum::Database(_) => true,
            _ => false,
        }
    }
    pub async fn create_database_pool(
        &self,
        id: i32,
        state: &mut State<'_, Connections>,
    ) -> Result<(), anyhow::Error> {
        let config = &self.base_config_enum;
        if let BaseConfigEnum::Database(config) = config {
            let pool = config.create_pool().await;
            let mut lock = state.map.lock().await;
            lock.insert(id, Box::new(pool));
        }
        Ok(())
    }
}
#[derive(Serialize_repr, Deserialize_repr, Clone, Default, PartialEq)]
#[repr(u8)]
pub enum ConfigKind {
    #[default]
    Database = 0,
    Kafka = 1,
    Zookeeper = 2,
}
impl ConfigKind {
    pub fn to_i32(&self) -> i32 {
        match self {
            ConfigKind::Database => 0,
            ConfigKind::Kafka => 1,
            ConfigKind::Zookeeper => 2,
        }
    }
}
#[derive(Deserialize, Serialize)]
pub enum BaseConfigEnum {
    #[serde(rename = "database")]
    Database(DatabaseConfig),
    #[serde(rename = "kafka")]
    Kafka(KafkaConfig),
}
impl Default for BaseConfigEnum {
    fn default() -> Self {
        BaseConfigEnum::Database(DatabaseConfig::default())
    }
}
#[derive(Deserialize, Serialize, Clone)]
pub struct KafkaConfig {
    pub broker: String,
    pub topic: String,
}
#[derive(Deserialize, Serialize, Default, Clone)]
pub struct DatabaseConfig {
    pub database_type: DateBaseType,
    pub source: DatabaseSource,
}
impl DatabaseConfig {
    pub async fn create_pool(&self) -> Result<Pool<sqlx::Any>, anyhow::Error> {
        let source = &self.source;
        let url = source.to_connection_url(self.database_type.clone())?;
        let pool: Pool<sqlx::Any> = Pool::connect(&url).await?;

        Ok(pool)
    }
}
#[derive(Deserialize, Serialize, Clone)]
pub enum DatabaseSource {
    #[serde(rename = "url")]
    Url(String),
    #[serde(rename = "host")]
    Host(DatabaseHostStruct),
}
impl DatabaseSource {
    pub fn to_connection_url(&self, database_type: DateBaseType) -> Result<String, anyhow::Error> {
        let url = match self {
            DatabaseSource::Url(url) => url.clone(),
            DatabaseSource::Host(host) => {
                format!(
                    "{}://{}:{}@{}:{}/{}",
                    database_type.protocal(),
                    host.user_name,
                    host.password,
                    host.host,
                    host.port,
                    host.database
                )
            }
        };
        println!("{}", url);
        Ok(url)
    }
}
impl Default for DatabaseSource {
    fn default() -> Self {
        DatabaseSource::Url("".to_string())
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
#[test]
fn test_host() -> Result<(), anyhow::Error> {
    let test_database_request = BaseConfigEnum::Database(DatabaseConfig {
        database_type: DateBaseType::Mysql,
        source: DatabaseSource::Host(DatabaseHostStruct {
            host: "localhost".to_string(),
            database: "test".to_string(),
            user_name: "root".to_string(),
            password: "123456".to_string(),
            port: 3306,
        }),
    });
    let ss = BaseConfig {
        base_config_enum: test_database_request,
        base_config_kind: ConfigKind::Database,
    };
    let json_str = serde_json::to_string(&ss)?;
    println!("{}", json_str);

    Ok(())
}
