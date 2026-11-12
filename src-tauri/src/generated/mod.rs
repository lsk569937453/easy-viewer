//! 构建期生成的代码入口。
//!
//! `database_types.rs` 由 `build.rs` 从 `plugins/connection-types/*.yaml` 生成，
//! 位于 `OUT_DIR`，不要手工编辑。

include!(concat!(env!("OUT_DIR"), "/database_types.rs"));
