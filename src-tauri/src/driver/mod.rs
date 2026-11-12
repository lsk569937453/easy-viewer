//! 驱动层：把「每个数据源各自一套命令实现」收敛成统一接口。
//!
//! - [`traits`]：`Driver` 契约与 boxed future 类型
//! - [`registry`]：连接配置 → 驱动实例的唯一构造入口
//! - `impls_*`：13 个数据源对 `Driver` 的实现（只粘合，不放业务逻辑）

pub mod registry;
pub mod traits;

mod impls_misc;
mod impls_storage;
mod impls_tabular;

pub use traits::{Driver, ProgressFn};
