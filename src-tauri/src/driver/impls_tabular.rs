//! 关系型 / 表格类数据源的 `Driver` 实现。
//!
//! 本文件只做粘合：把既有固有方法逐条转发到统一接口，不在这里写业务逻辑。
//! 不支持的操作不实现，交由 trait 默认实现返回明确的 `UnsupportedOperation`。

use crate::delegate;
use crate::delegate_app;
use crate::driver::traits::{describe_or_default, BoxFuture, Driver};
use crate::error::AppResult;
use crate::generated::DatabaseType;
use crate::service::clickhouse_service::ClickhouseConfig;
use crate::service::mssql_service::MssqlConfig;
use crate::service::mysql_service::MysqlConfig;
use crate::service::oracledb_service::OracledbConfig;
use crate::service::postgresql_service::PostgresqlConfig;
use crate::service::sqlite_service::SqliteConfig;
use crate::sql_lite::connection::AppState;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::show_column_response::ShowColumnsResponse;

impl Driver for MysqlConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Mysql
    }

    fn description(&self) -> String {
        describe_or_default(
            MysqlConfig::get_description(self),
            DatabaseType::Mysql.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(MysqlConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(MysqlConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, MysqlConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, MysqlConfig::exe_sql(self, req, &app, sql))
    }

    fn show_columns(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ShowColumnsResponse>> {
        delegate_app!(app, MysqlConfig::show_columns(self, req, &app))
    }

    fn get_ddl(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, MysqlConfig::get_ddl(self, req, &app))
    }

    fn column_info_for_insert(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<GetColumnInfoForInsertSqlResponse>> {
        delegate_app!(app, MysqlConfig::get_column_info_for_is(self, req, &app))
    }

    fn update_record(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sqls: Vec<String>,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::update_record(self, req, &app, sqls))
    }

    fn update_comment(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        new_comment: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::update_comment(self, req, &app, new_comment))
    }

    fn remove_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        column_name: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::remove_column(self, req, &app, column_name))
    }

    fn move_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        move_direction: i32,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(
            app,
            MysqlConfig::move_column(self, &app, req, move_direction)
        )
    }

    fn drop_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::drop_table(self, req, &app))
    }

    fn drop_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::drop_column(self, req, &app))
    }

    fn drop_index(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::drop_index(self, req, &app))
    }

    fn truncate_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::truncate_table(self, req, &app))
    }

    fn complete_words(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<Vec<String>>> {
        delegate_app!(app, MysqlConfig::get_complete_words(self, req, &app))
    }

    fn procedure_details(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, MysqlConfig::get_procedure_details(self, req, &app))
    }

    fn dump_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        dump_req: DumpDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::dump_database(self, req, &app, dump_req))
    }

    fn import_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        import_req: ImportDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MysqlConfig::import_database(self, req, &app, import_req))
    }

    fn init_dump_data(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<InitDumpDataResponse>> {
        delegate_app!(app, MysqlConfig::init_dump_data(self, req, &app))
    }

    fn generate_document(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        file_dir: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            MysqlConfig::generate_database_document(self, req, &app, file_dir)
        )
    }
}

impl Driver for PostgresqlConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Postgresql
    }

    fn description(&self) -> String {
        describe_or_default(
            PostgresqlConfig::get_description(self),
            DatabaseType::Postgresql.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(PostgresqlConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(PostgresqlConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, PostgresqlConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, PostgresqlConfig::exe_sql(self, req, &app, sql))
    }

    fn show_columns(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ShowColumnsResponse>> {
        delegate_app!(app, PostgresqlConfig::show_columns(self, req, &app))
    }

    fn get_ddl(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, PostgresqlConfig::get_ddl(self, req, &app))
    }

    fn column_info_for_insert(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<GetColumnInfoForInsertSqlResponse>> {
        delegate_app!(app, PostgresqlConfig::get_column_info_for_is(self, req, &app))
    }

    fn update_record(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sqls: Vec<String>,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, PostgresqlConfig::update_record(self, req, &app, sqls))
    }

    fn update_comment(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        new_comment: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            PostgresqlConfig::update_comment(self, req, &app, new_comment)
        )
    }

    fn remove_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        column_name: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            PostgresqlConfig::remove_column(self, req, &app, column_name)
        )
    }

    fn drop_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, PostgresqlConfig::drop_table(self, req, &app))
    }

    fn drop_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, PostgresqlConfig::drop_column(self, req, &app))
    }

    fn drop_index(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, PostgresqlConfig::drop_index(self, req, &app))
    }

    fn truncate_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, PostgresqlConfig::truncate_table(self, req, &app))
    }

    fn complete_words(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<Vec<String>>> {
        delegate_app!(app, PostgresqlConfig::get_complete_words(self, req, &app))
    }

    fn dump_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        dump_req: DumpDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            PostgresqlConfig::dump_database(self, req, &app, dump_req)
        )
    }

    fn import_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        import_req: ImportDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            PostgresqlConfig::import_database(self, req, &app, import_req)
        )
    }

    fn init_dump_data(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<InitDumpDataResponse>> {
        delegate_app!(app, PostgresqlConfig::init_dump_data(self, req, &app))
    }

    fn generate_document(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        file_dir: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            PostgresqlConfig::generate_database_document(self, req, &app, file_dir)
        )
    }
}

impl Driver for SqliteConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Sqlite
    }

    fn description(&self) -> String {
        describe_or_default(
            SqliteConfig::get_description(self),
            DatabaseType::Sqlite.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(SqliteConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(SqliteConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, SqliteConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, SqliteConfig::exe_sql(self, req, &app, sql))
    }

    fn show_columns(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ShowColumnsResponse>> {
        delegate_app!(app, SqliteConfig::show_columns(self, req, &app))
    }

    fn get_ddl(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, SqliteConfig::get_ddl(self, req, &app))
    }

    fn column_info_for_insert(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<GetColumnInfoForInsertSqlResponse>> {
        delegate_app!(app, SqliteConfig::get_column_info_for_is(self, req, &app))
    }

    fn update_record(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sqls: Vec<String>,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, SqliteConfig::update_record(self, req, &app, sqls))
    }

    fn drop_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, SqliteConfig::drop_table(self, req, &app))
    }

    fn drop_index(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, SqliteConfig::drop_index(self, req, &app))
    }

    fn truncate_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, SqliteConfig::truncate_table(self, req, &app))
    }

    fn complete_words(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<Vec<String>>> {
        delegate_app!(app, SqliteConfig::get_complete_words(self, req, &app))
    }

    fn dump_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        dump_req: DumpDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, SqliteConfig::dump_database(self, req, &app, dump_req))
    }

    fn import_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        import_req: ImportDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, SqliteConfig::import_database(self, req, &app, import_req))
    }

    fn init_dump_data(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<InitDumpDataResponse>> {
        delegate_app!(app, SqliteConfig::init_dump_data(self, req, &app))
    }
}

impl Driver for MssqlConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Mssql
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(MssqlConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(MssqlConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, MssqlConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, MssqlConfig::exe_sql(self, req, &app, sql))
    }

    fn show_columns(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ShowColumnsResponse>> {
        delegate_app!(app, MssqlConfig::show_columns(self, req, &app))
    }

    fn get_ddl(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, MssqlConfig::get_ddl(self, req, &app))
    }

    fn column_info_for_insert(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<GetColumnInfoForInsertSqlResponse>> {
        delegate_app!(app, MssqlConfig::get_column_info_for_is(self, req, &app))
    }

    fn update_record(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sqls: Vec<String>,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::update_record(self, req, &app, sqls))
    }

    fn update_comment(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        new_comment: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::update_comment(self, req, &app, new_comment))
    }

    fn remove_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        column_name: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::remove_column(self, req, &app, column_name))
    }

    fn drop_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::drop_table(self, req, &app))
    }

    fn drop_column(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::drop_column(self, req, &app))
    }

    fn drop_index(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::drop_index(self, req, &app))
    }

    fn truncate_table(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::truncate_table(self, req, &app))
    }

    fn complete_words(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<Vec<String>>> {
        delegate_app!(app, MssqlConfig::get_complete_words(self, req, &app))
    }

    fn procedure_details(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, MssqlConfig::get_procedure_details(self, req, &app))
    }

    fn dump_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        dump_req: DumpDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::dump_database(self, req, &app, dump_req))
    }

    fn import_database(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        import_req: ImportDatabaseReq,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MssqlConfig::import_database(self, req, &app, import_req))
    }

    fn init_dump_data(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<InitDumpDataResponse>> {
        delegate_app!(app, MssqlConfig::init_dump_data(self, req, &app))
    }

    fn generate_document(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        file_dir: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            MssqlConfig::generate_database_document(self, req, &app, file_dir)
        )
    }
}

impl Driver for ClickhouseConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Clickhouse
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(ClickhouseConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(ClickhouseConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, ClickhouseConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, ClickhouseConfig::exe_sql(self, req, &app, sql))
    }

    fn get_ddl(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<String>> {
        delegate_app!(app, ClickhouseConfig::get_ddl(self, req, &app))
    }

    fn update_record(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sqls: Vec<String>,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, ClickhouseConfig::update_record(self, req, &app, sqls))
    }

    fn delete_table_row(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        table_name: String,
        row_id: String,
        id_column: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            ClickhouseConfig::delete_table_row(self, req, &app, table_name, row_id, id_column)
        )
    }
}

impl Driver for OracledbConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Oracledb
    }

    fn description(&self) -> String {
        describe_or_default(
            OracledbConfig::get_description(self),
            DatabaseType::Oracledb.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(OracledbConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(OracledbConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, OracledbConfig::list_node_info(self, req, &app))
    }
}
