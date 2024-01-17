use crate::sql_lite::connection::SqlitePoolWrapper;
use crate::vojo::base_config::BaseConfig;
use crate::vojo::base_config::BaseConfigEnum;
use crate::vojo::base_config::ConfigKind;
use crate::vojo::base_config::DateBaseType;
use crate::vojo::common_constants::MYSQL_COMMON_URL;
use crate::vojo::common_constants::POST_GRESQL_COMMON_URL;
use crate::vojo::common_constants::SQLITE_COMMON_URL;
use crate::vojo::static_connections::Connections;
use serde::Deserialize;
use serde::Serialize;
use serde_repr::{Deserialize_repr, Serialize_repr};
use sqlx::mysql::MySqlConnection;
use sqlx::postgres::PgConnection;
use sqlx::Connection;
use sqlx::Database;
use sqlx::Pool;
use sqlx::Row;
use sqlx::SqliteConnection;
use std::fmt::{Display, Formatter};
use tauri::State;

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
    test_database_request: TestDatabaseRequest,
) -> core::result::Result<(), anyhow::Error> {
    let source_url = test_database_request.to_string();
    info!("databse request url:{}", source_url);
    match test_database_request.database_type {
        DateBaseType::Mysql => MySqlConnection::connect(&source_url).await.map(|_| ()),
        DateBaseType::Sqlite => SqliteConnection::connect(&source_url).await.map(|_| ()),
        DateBaseType::Postgresql => PgConnection::connect(&source_url).await.map(|_| ()),
    }
    .map_err(|e| {
        error!("{}", e);
        anyhow!("连接数据库失败:{}", e)
    })
}
pub async fn list_database_with_error(
    state: State<'_, SqlitePoolWrapper>,
    state2: &mut State<'_, Connections>,
    id: i32,
) -> Result<Vec<String>, anyhow::Error> {
    let statement = sqlx::query("select config_type,connection_json from base_config where id=?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    let json_str: String = statement.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&json_str)?;
    ensure!(
        base_config.base_config_kind == ConfigKind::Database,
        "配置不是数据库配置"
    );
    ensure!(base_config.is_database(), "配置不是数据库配置");
    let _ = base_config.create_database_pool(id, state2).await?;
    let lock = state2.map.lock().await;
    let pool = (lock.get(&id).ok_or(anyhow!("没有找到数据库"))?)
        .downcast_ref::<Pool<sqlx::Any>>()
        .ok_or(anyhow!("类型转换失败"))?;
    let rows = sqlx::query("show databases").fetch_all(pool).await?;
    let mut vec = vec![];
    for row in rows {
        let name: String = row.try_get(0)?;
        vec.push(name);
    }

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
    println!("{}", json_str);

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
    println!("{}", json_str);

    Ok(())
}
