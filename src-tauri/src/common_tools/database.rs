//! 连接可用性探测。
//!
//! 重构前这里铺着一整套 `DateBaseType` / `TestDatabaseRequest` / `TestSource` 死代码
//! （只被自己的测试引用），并且 `info!` 打出了含密码的整条连接 JSON。
//! 现在只保留一个不泄漏凭据的入口。

use crate::error::AppResult;
use crate::service::base_config_service::BaseConfig;

/// 用一份**未保存**的连接配置测试连通性（新建/编辑弹窗里的“测试连接”）。
pub async fn test_connection(base_config: &BaseConfig) -> AppResult<()> {
    let driver = crate::driver::registry::build(&base_config.base_config_enum)?;
    driver.test_connection().await
}
