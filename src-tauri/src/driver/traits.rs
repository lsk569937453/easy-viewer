//! 驱动抽象。
//!
//! # 设计取舍
//!
//! 参考 dbx 后发现：**它并没有统一 driver trait**，而是用枚举分发 + 同名自由函数约定。
//! 本项目规模小得多（13 个数据源、单 crate），仍然选择 trait，理由是 trait 能让
//! 「调用方只认一个接口」，从而把原来 3 层转发（`cmd` → `cmd_service` →
//! `base_config_service` 的 161 个 `match` 臂）压成 2 层。
//!
//! 与标准做法不同的两点：
//!
//! 1. trait 方法返回 boxed future 而不是 `async fn`：`Box<dyn Driver>` 需要
//!    dyn-compatible，RPITIT 目前做不到。这里不用 `#[async_trait]` 宏，
//!    手写 `Pin<Box<dyn Future + Send>>` 即原生写法，避免宏带来的隐式分配与
//!    文档可读性问题。
//! 2. **所有方法都有默认实现**，默认返回 [`ErrorCode::UnsupportedOperation`]。
//!    驱动只 override 自己支持的操作，于是「某个数据源不支持某操作」从原来的
//!    `_ => ()` / `_ => ExeSqlResponse::new()` 静默吞掉，变成明确的错误码 ——
//!    这正是本次重构要消灭的问题之一。
//!
//! 能力位（`Capabilities`）与这里的默认实现是**双保险**：能力位由 YAML 声明、
//! 供前端隐藏入口；默认实现兜住绕过 UI 的调用。

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use crate::error::{AppError, AppResult};
use crate::generated::DatabaseType;
use crate::sql_lite::connection::AppState;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_object_info_res::GetObjectInfoRes;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::show_column_response::ShowColumnsResponse;

/// dyn-compatible 的 future 类型别名。
pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// 上传进度回调（`Arc` 以便跨 trait 对象传递）。
pub type ProgressFn = Arc<dyn Fn(u64, u64) + Send + Sync>;

/// 生成一个默认实现：明确报「不支持」，并带上操作名与数据源标签。
macro_rules! unsupported_defaults {
    ($($(#[$meta:meta])* $name:ident ( $($arg:ident : $ty:ty),* $(,)? ) -> $ret:ty ;)*) => {
        $(
            $(#[$meta])*
            fn $name(&self, $($arg: $ty),*) -> BoxFuture<'_, AppResult<$ret>> {
                let label = self.db_type().label();
                let _ = ($($arg,)*);
                Box::pin(async move {
                    Err(AppError::unsupported(stringify!($name), label))
                })
            }
        )*
    };
}

/// 统一驱动接口。
pub trait Driver: Send + Sync {
    /// 数据源类型（由 YAML 描述符生成）。
    fn db_type(&self) -> DatabaseType;

    /// 连接列表里展示的一行说明（主机:端口 / 文件路径等）。
    fn description(&self) -> String {
        self.db_type().label().to_string()
    }

    /// 连接可用性探测。
    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>>;

    /// 服务端版本号。
    fn server_version(&self) -> BoxFuture<'_, AppResult<String>>;

    /// 左侧树的下钻：根据 `level_infos` 深度返回子节点。
    fn list_node_info(
        &self,
        _req: ListNodeInfoReq,
        _app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        let label = self.db_type().label();
        Box::pin(async move { Err(AppError::unsupported("list_node_info", label)) })
    }

    unsupported_defaults! {
        /// 执行 SQL / 查询语句。
        execute_sql(req: ListNodeInfoReq, app: &AppState, sql: String) -> ExeSqlResponse;
        /// 展示表结构列（`describe` 结果）。
        show_columns(req: ListNodeInfoReq, app: &AppState) -> ShowColumnsResponse;
        /// 取建表 DDL。
        get_ddl(req: ListNodeInfoReq, app: &AppState) -> String;
        /// 插入 SQL 向导所需的列信息。
        column_info_for_insert(req: ListNodeInfoReq, app: &AppState) -> GetColumnInfoForInsertSqlResponse;
        /// 批量更新记录（前端生成的多条 SQL）。
        update_record(req: ListNodeInfoReq, app: &AppState, sqls: Vec<String>) -> ();
        /// 删除表。
        drop_table(req: ListNodeInfoReq, app: &AppState) -> ();
        /// 删除列。
        drop_column(req: ListNodeInfoReq, app: &AppState) -> ();
        /// 删除索引。
        drop_index(req: ListNodeInfoReq, app: &AppState) -> ();
        /// 清空表。
        truncate_table(req: ListNodeInfoReq, app: &AppState) -> ();
        /// 删除单列（`remove_column`）。
        remove_column(req: ListNodeInfoReq, app: &AppState, column_name: String) -> ();
        /// 更新列注释。
        update_comment(req: ListNodeInfoReq, app: &AppState, new_comment: String) -> ();
        /// 调整列顺序。
        move_column(req: ListNodeInfoReq, app: &AppState, move_direction: i32) -> String;
        /// 删除一行记录。
        delete_table_row(req: ListNodeInfoReq, app: &AppState, table_name: String, row_id: String, id_column: String) -> ();
        /// 导出数据库。
        dump_database(req: ListNodeInfoReq, app: &AppState, dump_req: DumpDatabaseReq) -> ();
        /// 导入数据库。
        import_database(req: ListNodeInfoReq, app: &AppState, import_req: ImportDatabaseReq) -> ();
        /// 导出向导：列出表与列。
        init_dump_data(req: ListNodeInfoReq, app: &AppState) -> InitDumpDataResponse;
        /// 生成数据库文档（docx）。
        generate_document(req: ListNodeInfoReq, app: &AppState, file_dir: String) -> ();
        /// SQL 自动补全词库。
        complete_words(req: ListNodeInfoReq, app: &AppState) -> Vec<String>;
        /// 存储过程/函数详情。
        procedure_details(req: ListNodeInfoReq, app: &AppState) -> String;
        /// 新建集合（MongoDB）。
        create_collection(req: ListNodeInfoReq, app: &AppState, collection_name: String) -> ();

        // ---- 对象存储 ----
        /// 下载对象/目录。
        download_file(req: ListNodeInfoReq, app: &AppState, destination: String, is_folder: bool) -> ();
        /// 下载整个 bucket。
        download_bucket(req: ListNodeInfoReq, app: &AppState, destination: String) -> ();
        /// 上传文件。
        upload_file(req: ListNodeInfoReq, app: &AppState, local_file_path: String) -> ();
        /// 上传目录。
        upload_folder(req: ListNodeInfoReq, app: &AppState, local_dir: String) -> ();
        /// 分片上传（带进度回调）。
        upload_file_multipart(req: ListNodeInfoReq, local_file_path: String, progress: ProgressFn) -> ();
        /// 新建目录。
        create_folder(req: ListNodeInfoReq, app: &AppState, folder_name: String) -> ();
        /// 取对象元信息。
        get_object_info(req: ListNodeInfoReq, app: &AppState, is_folder: bool) -> GetObjectInfoRes;
        /// 删除 bucket 或对象。
        delete_bucket(req: ListNodeInfoReq, app: &AppState) -> ();
        /// 重命名对象。
        rename_object(req: ListNodeInfoReq, app: &AppState, new_name: String, is_folder: bool) -> ();
        /// 复制对象。
        copy_object(req: ListNodeInfoReq, app: &AppState, target_dir: String, is_folder: bool) -> ();
        /// 新建 bucket。
        create_bucket(bucket_name: String) -> ();

        // ---- KV / 消息 / 搜索 ----
        /// 执行一条 Redis 原生命令。
        redis_execute(command: String) -> crate::vojo::redis_command_response::RedisCommandResponse;
        /// 新建 Kafka topic。
        kafka_create_topic(topic: String, num_partitions: i32, replication_factor: i32) -> ();
        /// 删除 Kafka topic。
        kafka_delete_topic(topic: String) -> ();
        /// 向 Kafka topic 生产消息。
        kafka_produce_message(topic: String, key: Option<String>, value: String) -> ();
        /// 发送 RocketMQ 消息。
        rocketmq_send_message(topic: String, tag: Option<String>, value: String) -> ();
        /// Elasticsearch 文档检索。
        search_documents(index_name: String, query: Option<String>, search_query: Option<String>, from: i64, size: i64) -> ExeSqlResponse;
        /// Elasticsearch 索引详情。
        index_detail(index_name: String) -> serde_json::Value;
    }
}

/// 把一条固有方法调用转成 trait 需要的 boxed future。
///
/// 用法：`delegate!(SqliteConfig::exe_sql(self, req, app))`。
#[macro_export]
macro_rules! delegate {
    ($call:expr) => {
        Box::pin(async move { $call.await.map_err($crate::error::AppError::from) })
    };
}

/// 同上，但先把 `AppState` 克隆进 future。
///
/// `AppState` 内部只有 `SqlitePool`（Arc），克隆是常数开销；这样做是为了让返回的
/// future **不借用** `app`，从而 `BoxFuture<'_, _>` 只受 `&self` 生命周期约束
/// （否则 trait 方法需要显式声明两个输入生命周期的先后关系，签名会变得不可读）。
#[macro_export]
macro_rules! delegate_app {
    ($app:ident, $call:expr) => {{
        let $app = $app.clone();
        Box::pin(async move { $call.await.map_err($crate::error::AppError::from) })
    }};
}

/// 把各驱动的 `get_description() -> Result<String, _>` 收敛成 trait 的 `String`。
///
/// 描述只是 UI 上的一行文本，取不到时降级成数据源标签并记一条 warn，不影响可用性。
pub fn describe_or_default(
    result: Result<String, anyhow::Error>,
    fallback: impl Into<String>,
) -> String {
    match result {
        Ok(value) => value,
        Err(err) => {
            log::warn!("driver description failed: {err}");
            fallback.into()
        }
    }
}
