use super::config::PostgresqlConfig;
use super::queries::generate_ddl;
use super::queries::GET_SCHEMA_SQL;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnStructItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItem;
use crate::service::dump_data::dump_database_service::DumpTableList;
use crate::service::dump_data::postgresql_dump_data_service::PostgresqlDumpData;
use crate::service::dump_data::postgresql_dump_data_service::PostgresqlDumpDataItem;
use crate::sql_lite::connection::AppState;
use crate::util::sql_utils::postgres_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataColumnItem;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::init_dump_data_response::InitDumpSchemaResponseItem;
use crate::vojo::init_dump_data_response::InitDumpTableResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::anyhow;
use chrono::Local;
use docx_rs::*;
use itertools::Itertools;
use sqlx::Column;
use sqlx::Executor;
use sqlx::Row;
use sqlx::TypeInfo;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;

impl PostgresqlConfig {
    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let rows = sqlx::query(GET_SCHEMA_SQL).fetch_all(&mut conn).await?;
        let schema_names: Vec<String> = rows.iter().map(|row| row.get("schema_name")).collect();
        let mut init_dump_data_response = vec![];
        for schema_name in schema_names {
            let mut sql = format!(
                "SELECT table_name
FROM information_schema.tables
WHERE table_schema = '{}'  
  AND table_type = 'BASE TABLE';",
                schema_name
            );
            let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
                .fetch_all(&mut conn)
                .await?;
            let table_names: Vec<String> = rows.iter().map(|row| row.get("table_name")).collect();
            let mut init_dump_tables_responses = vec![];

            for table_name in table_names {
                sql = format!(
                    "SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = '{}'  
  AND table_name = '{}';",
                    schema_name, table_name
                );
                let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
                    .fetch_all(&mut conn)
                    .await?;
                let mut vec = vec![];
                for item in rows.iter() {
                    let column_name: String = item.try_get(0)?;
                    let column_type: String = item.try_get(1)?;
                    let init_column_item = InitDumpDataColumnItem::from(column_name, column_type);
                    vec.push(init_column_item);
                }
                let init_dump_tables = InitDumpTableResponseItem::from(table_name, vec);
                init_dump_tables_responses.push(init_dump_tables);
            }
            let init_dump_schema =
                InitDumpSchemaResponseItem::from(schema_name, init_dump_tables_responses);
            init_dump_data_response.push(init_dump_schema);
        }
        Ok(InitDumpDataResponse::from_schema_list(
            init_dump_data_response,
        ))
    }
    pub async fn import_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        import_database_req: ImportDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        info!("import_database_req: {:?}", import_database_req);
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

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
    pub async fn dump_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        dump_database_req: DumpDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let common_data = dump_database_req.source_data.get_postgresql_data()?;
        let mut vecs = vec![];
        for schema in common_data.list {
            let schema_checked = schema.checked;
            if !schema_checked {
                continue;
            }

            let schema_name = schema.schema_name;
            let create_schema_sql = format!(
                "SELECT 'CREATE SCHEMA ' || schema_name || ';'
FROM information_schema.schemata
WHERE schema_name = '{}';",
                schema_name.clone()
            );
            let creat_schema_row: String = sqlx::query(sqlx::AssertSqlSafe(create_schema_sql))
                .fetch_optional(&mut conn)
                .await?
                .ok_or(anyhow!("Not found schema"))?
                .try_get(0)?;
            let mut dump_data_list = vec![];

            for table in schema.table_list {
                let table_checked = table.checked;
                if !table_checked {
                    continue;
                }
                let table_name = table.table_name;
                let create_table_sql = generate_ddl(schema_name.clone(), table_name.clone());
                info!("create_table_sql: {}", create_table_sql);
                let creat_table_row: String = sqlx::query(sqlx::AssertSqlSafe(create_table_sql))
                    .fetch_optional(&mut conn)
                    .await?
                    .ok_or(anyhow!("Not found table"))?
                    .try_get(0)?;

                let mut dump_database_res_item = DumpDatabaseResItem::new();
                dump_database_res_item.table_name = table_name.clone();
                dump_database_res_item.table_struct = creat_table_row;
                if dump_database_req.export_option.is_export_data() {
                    let selected_column = table
                        .columns
                        .iter()
                        .filter(|x| x.checked)
                        .map(|x| x.column_name.clone())
                        .join(",");
                    let sql = format!(
                        "select {} from {}.{}",
                        selected_column,
                        schema_name.clone(),
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
                                let column_value = postgres_row_to_json(item, column_type, i)?;
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
                        dump_database_res_item.table_name =
                            format!("{}.{}", schema_name, table_name);
                    }
                }
                dump_data_list.push(dump_database_res_item);
            }
            let postgresql_dump_data_item =
                PostgresqlDumpDataItem::from(creat_schema_row, DumpTableList::from(dump_data_list));
            vecs.push(postgresql_dump_data_item);
        }
        info!("dump_data_list: {:#?}", vecs);
        let dump_database_res = PostgresqlDumpData::from(vecs);
        dump_database_res.export_to_file(dump_database_req)?;
        Ok(())
    }
    pub async fn generate_database_document(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        file_dir: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self
            .get_connection_with_database(database_name.clone())
            .await?;
        let rows = sqlx::query(GET_SCHEMA_SQL).fetch_all(&mut conn).await?;
        let schema_names: Vec<String> = rows.iter().map(|row| row.get("schema_name")).collect();
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
        for schema_name in schema_names {
            let get_table_sql = format!(
                "SELECT table_name
FROM information_schema.tables
WHERE table_schema = '{}';",
                schema_name
            );
            let tables_names = sqlx::query(sqlx::AssertSqlSafe(get_table_sql))
                .fetch_all(&mut conn)
                .await?
                .iter()
                .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
                .collect::<Result<Vec<String>, _>>()?;
            for table_name in tables_names {
                let show_column_sql = format!(
                    "SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{}' AND table_schema = '{}';",
                    table_name, schema_name
                );
                let rows = sqlx::query(sqlx::AssertSqlSafe(show_column_sql))
                    .fetch_all(&mut conn)
                    .await?;
                if rows.is_empty() {
                    return Ok(());
                }
                let first_row = rows.first().ok_or(anyhow!(""))?;
                let mut headers = vec![];

                for item in first_row.columns().iter() {
                    let type_name = item.type_info().name();
                    let column_name = item.name();
                    headers.push(ShowColumnHeader {
                        name: column_name.to_string(),
                        type_name: type_name.to_string().to_uppercase(),
                    });
                }
                let mut response_rows = vec![];
                for item in rows.iter() {
                    response_rows.push(super::rows::postgres_row_to_strings(item)?);
                }
                let show_column_response = ShowColumnsResponse::from(headers, response_rows);
                doc = doc.add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(format!("{}.{}", schema_name, table_name))),
                );
                let table = show_column_response.into_docx_table()?;
                doc = doc.add_table(table);
                doc = doc.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));
            }
        }
        doc.build().pack(file)?;

        Ok(())
    }
}
