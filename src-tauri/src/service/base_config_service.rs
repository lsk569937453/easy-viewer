//! 连接配置模型。
//!
//! 这里只保留**数据**：serde 枚举、地址结构体、以及「配置 → 数据源类型」的映射。
//! 所有行为（测试连接、浏览、执行 SQL、上传下载……）都已经搬到 `crate::driver`。
//!
//! 重构前本文件有 36 个分发方法、共 161 个 `match` 臂，把 13 个数据源的行为
//! 写死了三遍；现在只剩一个 13 行的 `db_type()`。

use serde::Deserialize;
use serde::Serialize;

use crate::generated::DatabaseType;
use crate::service::clickhouse_service::ClickhouseConfig;
use crate::service::elasticsearch_service::ElasticsearchConfig;
use crate::service::kafka_service::KafkaConfig;
use crate::service::mongdb_service::MongodbConfig;
use crate::service::mssql_service::MssqlConfig;
use crate::service::mysql_service::MysqlConfig;
use crate::service::oracledb_service::OracledbConfig;
use crate::service::postgresql_service::PostgresqlConfig;
use crate::service::redis_service::RedisConfig;
use crate::service::rocketmq_service::RocketmqConfig;
use crate::service::s3_service::S3Config;
use crate::service::sqlite_service::SqliteConfig;
use crate::service::webdav_service::WebdavConfig;

/// 连接配置联合体。
///
/// `#[serde(rename)]` 的值是**持久化格式**，改动会让已存的连接配置反序列化失败，
/// 因此与 `plugins/connection-types/*.yaml` 里的 `dbType` 必须保持一致。
#[derive(Deserialize, Serialize, Clone)]
pub enum BaseConfigEnum {
    #[serde(rename = "mysql")]
    Mysql(MysqlConfig),
    #[serde(rename = "postgresql")]
    Postgresql(PostgresqlConfig),
    #[serde(rename = "kafka")]
    Kafka(KafkaConfig),
    #[serde(rename = "sqlite")]
    Sqlite(SqliteConfig),
    #[serde(rename = "mongodb")]
    Mongodb(MongodbConfig),
    #[serde(rename = "oracledb")]
    Oracledb(OracledbConfig),
    #[serde(rename = "mssql")]
    Mssql(MssqlConfig),
    #[serde(rename = "clickhouse")]
    Clickhouse(ClickhouseConfig),
    #[serde(rename = "s3")]
    S3(S3Config),
    #[serde(rename = "redis")]
    Redis(RedisConfig),
    #[serde(rename = "elasticsearch")]
    Elasticsearch(ElasticsearchConfig),
    #[serde(rename = "rocketmq")]
    Rocketmq(RocketmqConfig),
    #[serde(rename = "webdav")]
    Webdav(WebdavConfig),
}

impl BaseConfigEnum {
    /// 数据源类型。前端使用的 `connection_type` 数值由 YAML 描述符统一映射，
    /// 不再像以前那样在这里手写 0..12 的魔数。
    pub const fn db_type(&self) -> DatabaseType {
        match self {
            BaseConfigEnum::Mysql(_) => DatabaseType::Mysql,
            BaseConfigEnum::Postgresql(_) => DatabaseType::Postgresql,
            BaseConfigEnum::Kafka(_) => DatabaseType::Kafka,
            BaseConfigEnum::Sqlite(_) => DatabaseType::Sqlite,
            BaseConfigEnum::Mongodb(_) => DatabaseType::Mongodb,
            BaseConfigEnum::Oracledb(_) => DatabaseType::Oracledb,
            BaseConfigEnum::Mssql(_) => DatabaseType::Mssql,
            BaseConfigEnum::Clickhouse(_) => DatabaseType::Clickhouse,
            BaseConfigEnum::S3(_) => DatabaseType::S3,
            BaseConfigEnum::Redis(_) => DatabaseType::Redis,
            BaseConfigEnum::Elasticsearch(_) => DatabaseType::Elasticsearch,
            BaseConfigEnum::Rocketmq(_) => DatabaseType::Rocketmq,
            BaseConfigEnum::Webdav(_) => DatabaseType::Webdav,
        }
    }

    /// 前端历史字段 `connection_type`（i32）。
    pub const fn connection_type(&self) -> i32 {
        self.db_type().connection_type()
    }

    /// 列表展示用的一行说明。
    pub fn description(&self) -> String {
        match crate::driver::registry::build(self) {
            Ok(driver) => driver.description(),
            Err(err) => {
                warn!("build driver for description failed: {err}");
                self.db_type().label().to_string()
            }
        }
    }
}

/// 数据库连接地址（由各关系型/类关系型配置共用）。
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
        match &self.database {
            Some(database) => format!(
                "{}://{}:{}@{}:{}/{}",
                protocol_name, self.user_name, self.password, self.host, self.port, database
            ),
            None => format!(
                "{}://{}:{}@{}:{}",
                protocol_name, self.user_name, self.password, self.host, self.port
            ),
        }
    }
}

/// 持久化到 `base_config.connection_json` 的外层信封。
#[derive(Deserialize, Serialize)]
pub struct BaseConfig {
    pub base_config_enum: BaseConfigEnum,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use super::*;

    #[test]
    fn decodes_every_connection_type() {
        // 关系型/类关系型配置都是 `{ "config": DatabaseHostStruct }` 形状。
        let host = r#"{"config":{"host":"h","user_name":"u","password":"p","port":1}}"#;
        let samples = [
            ("mysql", host),
            ("postgresql", host),
            ("mssql", host),
            ("clickhouse", host),
            ("oracledb", host),
            ("mongodb", host),
            ("redis", host),
            ("elasticsearch", host),
            ("sqlite", r#"{"file_path":"/tmp/a.db"}"#),
            ("kafka", r#"{"broker":"h:9092"}"#),
            ("rocketmq", r#"{"proxy_url":"h:8081","topics":[]}"#),
            (
                "s3",
                r#"{"config":{"host":"h","port":443,"access_key":"a","secret_key":"s","region":"r"}}"#,
            ),
            (
                "webdav",
                r#"{"config":{"host":"h","port":80,"username":"u","password":"p","root_path":"/","use_tls":false}}"#,
            ),
        ];
        assert_eq!(samples.len(), 13, "应覆盖全部数据源");
        for (tag, payload) in samples {
            let json = format!(r#"{{"base_config_enum":{{"{tag}":{payload}}}}}"#);
            let parsed: BaseConfig = serde_json::from_str(&json)
                .unwrap_or_else(|err| panic!("{tag} 反序列化失败: {err}"));
            assert_eq!(parsed.base_config_enum.db_type().as_str(), tag);
        }
    }

    #[test]
    fn connection_type_matches_manifest() {
        let json = r#"{"base_config_enum":{"sqlite":{"file_path":"/tmp/a.db"}}}"#;
        let parsed: BaseConfig = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.base_config_enum.connection_type(), 3);
    }
}
