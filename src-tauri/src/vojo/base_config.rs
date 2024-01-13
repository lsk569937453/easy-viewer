use serde::Deserialize;
use serde::Serialize;
use serde_repr::{Deserialize_repr, Serialize_repr};
#[derive(Serialize_repr, Deserialize_repr, Clone)]
#[repr(u8)]
pub enum DateBaseType {
    Mysql = 0,
    Sqlite = 1,
    Postgresql = 2,
}
#[derive(Deserialize, Serialize)]
pub struct BaseConfig {
    pub base_config_enum: BaseConfigEnum,
    pub base_config_kind: ConfigKind,
}
#[derive(Serialize_repr, Deserialize_repr, Clone)]
#[repr(u8)]
pub enum ConfigKind {
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
#[derive(Deserialize, Serialize, Clone)]
pub struct KafkaConfig {
    pub broker: String,
    pub topic: String,
}
#[derive(Deserialize, Serialize, Clone)]
pub struct DatabaseConfig {
    pub database_type: DateBaseType,
    pub source: DatabaseSource,
}
#[derive(Deserialize, Serialize, Clone)]
pub enum DatabaseSource {
    #[serde(rename = "url")]
    Url(String),
    #[serde(rename = "host")]
    Host(DatabaseHostStruct),
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
