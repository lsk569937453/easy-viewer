//! 驱动注册表：连接配置 → 驱动实例。
//!
//! 这是**唯一**知道「有哪些数据源实现」的地方。之前这份知识散落在
//! `BaseConfigEnum` 的 161 个 `match` 臂里（36 个方法 × 13 个变体），
//! 新增一个数据源要改 5 处；现在只剩这里的 13 行。
//!
//! 新增数据源的正确做法：
//! 1. 在 `plugins/connection-types/` 加一个 YAML；
//! 2. 写一个配置结构体并实现 `Driver`；
//! 3. 在下面的 match 里加一行。

use crate::error::AppResult;
use crate::service::base_config_service::BaseConfigEnum;

use super::traits::Driver;

/// 根据连接配置构造驱动实例。
///
/// 配置结构体都很小（若干 String / i32），克隆一份交给 trait 对象，
/// 换来的好处是 `Box<dyn Driver>` 不携带生命周期，命令层可以自由传递。
pub fn build(config: &BaseConfigEnum) -> AppResult<Box<dyn Driver>> {
    Ok(match config {
        BaseConfigEnum::Mysql(item) => Box::new(item.clone()),
        BaseConfigEnum::Postgresql(item) => Box::new(item.clone()),
        BaseConfigEnum::Sqlite(item) => Box::new(item.clone()),
        BaseConfigEnum::Mssql(item) => Box::new(item.clone()),
        BaseConfigEnum::Clickhouse(item) => Box::new(item.clone()),
        BaseConfigEnum::Oracledb(item) => Box::new(item.clone()),
        BaseConfigEnum::Mongodb(item) => Box::new(item.clone()),
        BaseConfigEnum::Redis(item) => Box::new(item.clone()),
        BaseConfigEnum::Elasticsearch(item) => Box::new(item.clone()),
        BaseConfigEnum::Kafka(item) => Box::new(item.clone()),
        BaseConfigEnum::Rocketmq(item) => Box::new(item.clone()),
        BaseConfigEnum::S3(item) => Box::new(item.clone()),
        BaseConfigEnum::Webdav(item) => Box::new(item.clone()),
    })
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use super::*;
    use crate::generated::DatabaseType;
    use crate::service::base_config_service::BaseConfig;

    fn parse(json: &str) -> BaseConfigEnum {
        let config: BaseConfig = serde_json::from_str(json).expect("valid config");
        config.base_config_enum
    }

    #[test]
    fn builds_sqlite_driver() {
        let config = parse(r#"{"base_config_enum":{"sqlite":{"file_path":"/tmp/a.db"}}}"#);
        let driver = build(&config).expect("build driver");
        assert_eq!(driver.db_type(), DatabaseType::Sqlite);
        assert_eq!(driver.description(), "/tmp/a.db");
    }

    #[test]
    fn sqlite_declares_expected_capabilities() {
        let config = parse(r#"{"base_config_enum":{"sqlite":{"file_path":"/tmp/a.db"}}}"#);
        let driver = build(&config).expect("build driver");
        let caps = driver.db_type().capabilities();
        assert!(caps.query());
        assert!(caps.schema());
        assert!(!caps.object_store());
        assert!(!caps.topics());
    }
}
