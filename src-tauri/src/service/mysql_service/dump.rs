use super::config::MysqlConfig;
use crate::service::dump_data::dump_database_service::DumpDatabaseRes;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnStructItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItem;
use crate::service::dump_data::dump_database_service::DumpTableList;
use crate::service::mysql_common_service::show_column_info;
use crate::sql_lite::connection::AppState;
use crate::util::sql_utils::mysql_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataColumnItem;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::init_dump_data_response::InitDumpTableResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use anyhow::Ok;
use chrono::Local;
use docx_rs::*;
use itertools::Itertools;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use sqlx::TypeInfo;
use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};

impl MysqlConfig {
    pub async fn dump_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _: &AppState,
        dump_database_req: DumpDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let sql = format!("use {}", database_name.clone());
        info!("sql: {}", sql);
        conn.execute(sqlx::AssertSqlSafe(sql)).await?;

        let rows = sqlx::query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';")
            .fetch_all(&mut conn)
            .await?;

        let mut dump_data_list = vec![];
        let common_data = dump_database_req.source_data.get_common_data()?;
        for item in rows {
            let buf: &[u8] = item.try_get(0)?;
            let table_name = String::from_utf8_lossy(buf).to_string();
            let table_index = common_data
                .tables
                .iter()
                .position(|x| x.name == table_name)
                .ok_or(anyhow!("table not found"))?;
            if !common_data.tables[table_index].checked {
                continue;
            }
            let mut dump_database_res_item = DumpDatabaseResItem::new();
            if dump_database_req.export_option.is_export_struct() {
                let sql = format!("show create table {}", table_name);
                let row = sqlx::query(sqlx::AssertSqlSafe(sql))
                    .fetch_optional(&mut conn)
                    .await?
                    .ok_or(anyhow!("Not found table"))?;
                let ddl: String = row.try_get(1)?;
                dump_database_res_item.table_struct = ddl;
            }
            if dump_database_req.export_option.is_export_data() {
                let selected_column = common_data.columns[table_index]
                    .iter()
                    .filter(|x| x.checked)
                    .map(|x| x.column_name.clone())
                    .join(",");
                let sql = format!(
                    "select {} from {}.{}",
                    selected_column,
                    database_name.clone(),
                    table_name.clone()
                );
                let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
                    .fetch_all(&mut conn)
                    .await?;
                if !rows.is_empty() {
                    let mut vec = vec![];
                    let mut column_structs = vec![];
                    for (row_index, item) in rows.iter().enumerate() {
                        let columns = item.columns();
                        let len = columns.len();
                        let mut database_res_column_list = vec![];
                        for (i, _) in columns.iter().enumerate().take(len) {
                            let column_name = columns[i].name();
                            let column_type = columns[i].type_info().name();
                            let column_value = mysql_row_to_json(item, column_type, i)?;
                            let database_res_column_item =
                                DumpDatabaseResColumnItem::from(column_value);
                            database_res_column_list.push(database_res_column_item);

                            if row_index == 0 {
                                let database_res_column_struct_item =
                                    DumpDatabaseResColumnStructItem::from(
                                        column_name.to_string(),
                                        column_type.to_string(),
                                    );
                                column_structs.push(database_res_column_struct_item);
                            }
                        }
                        vec.push(database_res_column_list);
                    }
                    dump_database_res_item.column_list = vec;
                    dump_database_res_item.column_structs = column_structs;
                    dump_database_res_item.table_name = table_name;
                }
            }
            dump_data_list.push(dump_database_res_item);
        }
        info!("dump_data_list: {:#?}", dump_data_list);
        let dump_database_res = DumpDatabaseRes::from(DumpTableList::from(dump_data_list));
        dump_database_res.export_to_file(dump_database_req)?;
        Ok(())
    }

    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let sql = format!("use {}", database_name.clone());
        info!("sql: {}", sql);
        conn.execute(sqlx::AssertSqlSafe(sql)).await?;

        let rows = sqlx::query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';")
            .fetch_all(&mut conn)
            .await?;
        let mut init_dump_data_responses = vec![];
        for item in rows {
            let buf: &[u8] = item.try_get(0)?;
            let table_name = String::from_utf8_lossy(buf).to_string();
            let get_columns_sql = format!(
                "SELECT COLUMN_NAME,COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '{}'
  AND TABLE_NAME = '{}';",
                database_name, table_name
            );
            let list = sqlx::query(sqlx::AssertSqlSafe(get_columns_sql))
                .fetch_all(&mut conn)
                .await?;
            let mut vec = vec![];
            for item in list {
                let column_name: String = item.try_get(0)?;
                let column_type: String = item.try_get(1)?;
                let init_column_item = InitDumpDataColumnItem::from(column_name, column_type);
                vec.push(init_column_item);
            }
            let init_dump_data_response = InitDumpTableResponseItem::from(table_name, vec);
            init_dump_data_responses.push(init_dump_data_response);
        }

        Ok(InitDumpDataResponse::from_table_list(
            init_dump_data_responses,
        ))
    }

    pub async fn import_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _: &AppState,
        import_database_req: ImportDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        info!("import_database_req: {:?}", import_database_req);
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let sql = format!("use {}", database_name.clone());
        info!("sql: {}", sql);
        conn.execute(sqlx::AssertSqlSafe(sql)).await?;
        let file = File::open(&import_database_req.file_path).await?;

        let reader = BufReader::new(file);

        let mut lines = reader.lines();

        let mut sql_buffer = String::new();

        while let Some(line) = lines.next_line().await? {
            if line.trim().is_empty() {
                if !sql_buffer.trim().is_empty() {
                    info!("Executing SQL: {}", sql_buffer);
                    conn.execute(sqlx::AssertSqlSafe(sql_buffer.clone()))
                        .await?;
                }
            } else {
                sql_buffer.push_str(&line);
                sql_buffer.push('\n');
            }
        }

        if !sql_buffer.trim().is_empty() {
            info!("Executing final SQL: {}", sql_buffer);
            conn.execute(sqlx::AssertSqlSafe(sql_buffer)).await?;
        }
        Ok(())
    }

    pub async fn generate_database_document(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        file_dir: String,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;

        let rows = sqlx::query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';")
            .fetch_all(&mut conn)
            .await?;

        let dir_path = Path::new(&file_dir);
        let now = Local::now();
        let formatted_time = now.format("%Y-%m-%d-%H-%M-%S").to_string();
        let file_name = format!("{}-{}.docx", database_name, formatted_time);
        let full_path = dir_path.join(file_name);
        info!("full_path: {}", full_path.display());
        let file = std::fs::File::create(full_path)?;

        let style3 = Style::new("Table1", StyleType::Table)
            .name("Table test")
            .table_align(TableAlignmentType::Center);
        let mut doc = Docx::new().add_style(style3);
        for item in rows {
            let buf: &[u8] = item.try_get(0)?;
            let table_name = String::from_utf8_lossy(buf).to_string();
            doc = doc
                .add_paragraph(Paragraph::new().add_run(Run::new().add_text(table_name.clone())));
            let show_column_response = show_column_info(&mut conn, table_name.clone()).await?;
            let table = show_column_response.into_docx_table()?;
            doc = doc.add_table(table);
            doc = doc.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));
        }

        doc.build().pack(file)?;

        Ok(())
    }
}
