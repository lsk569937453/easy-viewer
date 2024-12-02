use crate::service::base_config_service::BaseConfig;
use crate::sql_lite::connection::AppState;

use crate::vojo::static_connections::Connections;
use serde::Deserialize;
use serde::Serialize;
use serde_repr::Deserialize_repr;
use serde_repr::Serialize_repr;
use sqlx::Row;
use std::fmt::{Display, Formatter};
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
#[derive(Deserialize, Serialize)]
pub struct TestDatabaseRequest {
    pub database_type: DateBaseType,
    pub source: TestSource,
}
#[derive(Deserialize, Serialize, Clone)]
pub enum TestSource {
    TestUrl(String),
    TestHost(TestHostStruct),
}
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TestHostStruct {
    pub host: String,
    pub database: String,
    pub user_name: String,
    pub password: String,
    pub port: i32,
}
impl Display for TestDatabaseRequest {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result<(), std::fmt::Error> {
        let url = match self.source.clone() {
            TestSource::TestUrl(url) => url,
            TestSource::TestHost(test_host_struct) => match self.database_type {
                DateBaseType::Mysql => format!(
                    "mysql://{}:{}@{}:{}/{}",
                    test_host_struct.user_name,
                    test_host_struct.password,
                    test_host_struct.host,
                    test_host_struct.port,
                    test_host_struct.database
                ),
                DateBaseType::Sqlite => format!(
                    "mysql://{}:{}@{}:{}/{}",
                    test_host_struct.user_name,
                    test_host_struct.password,
                    test_host_struct.host,
                    test_host_struct.port,
                    test_host_struct.database
                ),
                DateBaseType::Postgresql => format!(
                    "postgres://{}:{}@{}:{}/{}",
                    test_host_struct.user_name,
                    test_host_struct.password,
                    test_host_struct.host,
                    test_host_struct.port,
                    test_host_struct.database
                ),
            },
        };

        write!(f, "{}", url)
    }
}
pub async fn test_url_with_error(
    base_config: BaseConfig,
) -> core::result::Result<(), anyhow::Error> {
    let source_url = serde_json::to_string(&base_config)?;
    info!("databse request url:{}", source_url);
    base_config
        .base_config_enum
        .test_connection()
        .await
        .map_err(|e| {
            error!("{}", e);
            anyhow!("连接数据库失败:{}", e)
        })
}
pub async fn list_database_with_error(
    state: State<'_, AppState>,
    state2: State<'_, Connections>,
    id: i32,
) -> Result<Vec<String>, anyhow::Error> {
    let statement = sqlx::query("select config_type,connection_json from base_config where id=?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    let json_str: String = statement.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&json_str)?;

    let vec = Vec::new();

    Ok(vec)
}

async fn connection_with_database(
    base_config: BaseConfig,
    state2: State<'_, Connections>,
) -> Result<(), anyhow::Error> {
    let lock = state2.map.lock().await;

    Ok(())
}
#[test]
fn test() -> Result<(), anyhow::Error> {
    let test_database_request = TestDatabaseRequest {
        database_type: DateBaseType::Mysql,
        source: TestSource::TestUrl("mysql://root:123456@localhost:3306/test".to_string()),
    };
    let json_str = serde_json::to_string(&test_database_request)?;
    info!("{}", json_str);

    Ok(())
}
#[test]
fn test_host() -> Result<(), anyhow::Error> {
    let test_database_request = TestDatabaseRequest {
        database_type: DateBaseType::Mysql,
        source: TestSource::TestHost(TestHostStruct {
            host: "localhost".to_string(),
            database: "test".to_string(),
            user_name: "root".to_string(),
            password: "123456".to_string(),
            port: 3306,
        }),
    };
    let json_str = serde_json::to_string(&test_database_request)?;
    info!("{}", json_str);

    Ok(())
}
