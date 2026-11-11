use super::config::MssqlConfig;
use super::queries::get_ddl_sql;
use super::queries::get_schema_sql;
use super::queries::get_table_sql;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnStructItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItem;
use crate::service::dump_data::dump_database_service::DumpTableList;
use crate::service::dump_data::mssql_dump_data_service::MssqlDumpData;
use crate::service::dump_data::mssql_dump_data_service::MssqlDumpDataItem;
use crate::util::sql_utils::mssql_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataColumnItem;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::init_dump_data_response::InitDumpSchemaResponseItem;
use crate::vojo::init_dump_data_response::InitDumpTableResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::AppState;
use anyhow::anyhow;
use chrono::Local;
use docx_rs::*;
use futures_util::TryStreamExt;
use itertools::Itertools;
use std::path::Path;
use std::vec;
use tiberius::Client;
use tiberius::QueryItem;
use tokio::fs::File;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;

async fn run_sql(conn: &mut Client<Compat<TcpStream>>, sql: &str) -> Result<(), anyhow::Error> {
    if sql.contains("CREATE SCHEMA") {
        conn.simple_query(sql).await?;
    } else {
        conn.execute(sql, &[]).await?;
    }
    Ok(())
}

impl MssqlConfig {
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
                    run_sql(&mut conn, &sql_buffer).await?;
                    sql_buffer.clear();
                }
            } else {
                sql_buffer.push_str(&line);
                sql_buffer.push('\n');
            }
        }

        if !sql_buffer.trim().is_empty() {
            info!("Executing final SQL: {}", sql_buffer);
            // conn.execute(&*sql_buffer, &[]).await?;
            run_sql(&mut conn, &sql_buffer).await?;
        }
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

        let rows = conn
            .query(&get_schema_sql(database_name.clone()), &[])
            .await?
            .into_first_result()
            .await?;
        let schema_names = rows.iter().map(|row| -> Result<&str, anyhow::Error> {
            row.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
        });
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
        for item in schema_names {
            let schema_name = item?.to_string();
            let get_table_sql = get_table_sql(schema_name.clone());

            let rows = conn
                .query(&get_table_sql, &[])
                .await?
                .into_first_result()
                .await?;
            let table_rows = rows.iter().map(|item| -> Result<&str, anyhow::Error> {
                item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
            });

            for table_rows_item in table_rows {
                let table_name = table_rows_item?.to_string();
                let show_column_sql = format!(
                    "SELECT 
    COLUMN_NAME AS column_name, 
    DATA_TYPE AS data_type, 
    IS_NULLABLE AS is_nullable, 
    COLUMN_DEFAULT AS column_default
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{}' 
  AND TABLE_SCHEMA = '{}';",
                    table_name, schema_name
                );
                let mut rows = conn.query(&show_column_sql, &[]).await?;
                let mut headers = vec![];
                let mut response_rows = vec![];

                while let Some(query_item) = rows.try_next().await? {
                    match query_item {
                        QueryItem::Row(row_data) => {
                            let mut row = vec![];
                            for (_, column_data) in row_data.cells() {
                                let val = mssql_row_to_json(column_data)?;
                                if val.is_string() {
                                    row.push(Some(val.as_str().unwrap_or_default().to_string()));
                                } else if val.is_null() {
                                    row.push(None);
                                } else {
                                    row.push(Some(val.to_string()));
                                }
                            }
                            response_rows.push(row);
                        }
                        QueryItem::Metadata(metadata) => {
                            for item in metadata.columns().iter() {
                                let type_name = item.column_type();
                                let type_name_str = format!("{:?}", type_name);
                                let column_name = item.name();
                                headers.push(ShowColumnHeader {
                                    name: column_name.to_string(),
                                    type_name: type_name_str.to_uppercase(),
                                });
                            }
                        }
                    }
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
            let create_schema = format!("CREATE SCHEMA [{}];", schema_name.clone());
            let mut dump_data_list = vec![];

            for table in schema.table_list {
                let table_checked = table.checked;
                if !table_checked {
                    continue;
                }
                let table_name = table.table_name;
                let create_table_sql = get_ddl_sql(schema_name.clone(), table_name.clone());
                info!("create_table_sql: {}", create_table_sql);
                let creat_table_row = conn
                    .query(&create_table_sql, &[])
                    .await?
                    .into_row()
                    .await?
                    .ok_or(anyhow!(""))?;
                let create_table: &str = creat_table_row.try_get(0)?.ok_or(anyhow!(""))?;

                let mut dump_database_res_item = DumpDatabaseResItem::new();
                dump_database_res_item.table_name = table_name.clone();
                dump_database_res_item.table_struct = create_table.to_string();
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
                    info!("sql: {}", sql);
                    let rows = conn.query(&sql, &[]).await?.into_first_result().await?;
                    if !rows.is_empty() {
                        let mut vec = vec![];
                        let mut column_structs = vec![];
                        for (row_index, item) in rows.iter().enumerate() {
                            let mut database_res_column_list = vec![];
                            for (column, column_data) in item.cells() {
                                let column_name = column.name();
                                let column_type = column.column_type();
                                let type_name_str = format!("{:?}", column_type);

                                let column_value = mssql_row_to_json(column_data)?;
                                let database_res_column_item =
                                    DumpDatabaseResColumnItem::from(column_value);
                                database_res_column_list.push(database_res_column_item);

                                if row_index == 0 {
                                    let database_res_column_struct_item =
                                        DumpDatabaseResColumnStructItem::from(
                                            column_name.to_string(),
                                            type_name_str.to_string(),
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
            let mssql_dump_data_item = MssqlDumpDataItem::from(
                create_schema.to_string(),
                DumpTableList::from(dump_data_list),
            );
            vecs.push(mssql_dump_data_item);
        }
        info!("dump_data_list: {:#?}", vecs);
        let dump_database_res = MssqlDumpData::from(vecs);
        dump_database_res.export_to_file(dump_database_req)?;
        Ok(())
    }

    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self
            .get_connection_with_database(database_name.clone())
            .await?;
        let sql = get_schema_sql(database_name);

        let schema_rows = conn.query(&sql, &[]).await?.into_first_result().await?;
        let schema_names = schema_rows
            .iter()
            .map(|item| -> Result<&str, anyhow::Error> {
                item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
            });

        let mut init_dump_data_response = vec![];
        for item in schema_names {
            let schema_name = item?;
            let mut sql = get_table_sql(schema_name.to_string());
            let table_rows = conn.query(&sql, &[]).await?.into_first_result().await?;
            let table_names = table_rows
                .iter()
                .map(|item| -> Result<&str, anyhow::Error> {
                    item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
                });

            let mut init_dump_tables_responses = vec![];

            for table_item in table_names {
                let table_name = table_item?;
                sql = format!(
                    "SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = '{}'  
  AND table_name = '{}';",
                    schema_name, table_name
                );
                let rows = conn.query(&sql, &[]).await?.into_first_result().await?;

                let mut vec = vec![];
                for item in rows.iter() {
                    let column_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
                    let column_type: &str = item.try_get(1)?.ok_or(anyhow!(""))?;
                    let init_column_item = InitDumpDataColumnItem::from(
                        column_name.to_string(),
                        column_type.to_string(),
                    );
                    vec.push(init_column_item);
                }
                let init_dump_tables = InitDumpTableResponseItem::from(table_name.to_string(), vec);
                init_dump_tables_responses.push(init_dump_tables);
            }
            let init_dump_schema = InitDumpSchemaResponseItem::from(
                schema_name.to_string(),
                init_dump_tables_responses,
            );
            init_dump_data_response.push(init_dump_schema);
        }
        Ok(InitDumpDataResponse::from_schema_list(
            init_dump_data_response,
        ))
    }
}
