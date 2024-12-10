use itertools::Itertools;
use std::collections::HashSet;
use std::path::Path;
use std::vec;

use crate::util::common_utils::serde_value_to_string;
use crate::util::sql_utils::sqlite_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::ColumnTypeFlag;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataColumnItem;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::init_dump_data_response::InitDumpTableResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::vojo::sql_parse_result::SqlParseResult;
use crate::AppState;
use anyhow::Ok;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::Row;
use sqlx::SqliteConnection;
use sqlx::TypeInfo;
use sqlx::ValueRef;
use std::sync::OnceLock;
use tokio::fs::File;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;

use super::dump_data::dump_database_service::DumpDatabaseRes;
use super::dump_data::dump_database_service::DumpDatabaseResColumnItem;
use super::dump_data::dump_database_service::DumpDatabaseResColumnStructItem;
use super::dump_data::dump_database_service::DumpDatabaseResItem;
use super::dump_data::dump_database_service::DumpTableList;
static SQLITE_ROOT_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
static SQLITE_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_sqlite_root_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    SQLITE_ROOT_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map
    })
}
fn get_sqlite_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    SQLITE_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map.insert("Partitions", "partitions");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct SqliteConfig {
    pub file_path: String,
}
impl SqliteConfig {
    pub async fn truncate_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        sqlx::query(&format!("DELETE FROM {};", level_infos[2].config_value))
            .execute(&mut conn)
            .await?;

        Ok(())
    }
    pub async fn import_database(
        &self,
        _list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        import_database_req: ImportDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        info!("import_database_req: {:?}", import_database_req);
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let file = File::open(&import_database_req.file_path).await?;

        let reader = BufReader::new(file);

        let mut lines = reader.lines();

        let mut sql_buffer = String::new();

        while let Some(line) = lines.next_line().await? {
            if line.trim().is_empty() {
                if !sql_buffer.trim().is_empty() {
                    info!("Executing SQL: {}", sql_buffer);
                    conn.execute(&*sql_buffer).await?;
                    sql_buffer.clear();
                }
            } else {
                sql_buffer.push_str(&line);
                sql_buffer.push('\n');
            }
        }

        if !sql_buffer.trim().is_empty() {
            info!("Executing final SQL: {}", sql_buffer);
            conn.execute(&*sql_buffer).await?;
        }
        Ok(())
    }
    pub async fn init_dump_data(
        &self,
        _list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let sql = "SELECT name 
FROM sqlite_master 
WHERE type = 'table' and name !='sqlite_sequence';"
            .to_string();
        let table_names = sqlx::query(&sql)
            .fetch_all(&mut conn)
            .await?
            .iter()
            .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get("name")?) })
            .collect::<Result<Vec<String>, anyhow::Error>>()?;
        let mut tables = vec![];
        for table in table_names {
            let get_column_info_sql = format!("PRAGMA table_info({});", table);
            let rows = sqlx::query(&get_column_info_sql)
                .fetch_all(&mut conn)
                .await?;
            let mut columns = vec![];
            for row in rows {
                let column_name: String = row.try_get("name")?;
                let column_type: String = row.try_get("type")?;
                let ini = InitDumpDataColumnItem::from(column_name, column_type);
                columns.push(ini);
            }
            let table = InitDumpTableResponseItem::from(table, columns);
            tables.push(table);
        }
        Ok(InitDumpDataResponse::from_table_list(tables))
    }
    pub async fn dump_database(
        &self,
        _list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        dump_database_req: DumpDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let common_data = dump_database_req.source_data.get_common_data()?;
        let mut dump_data_list = vec![];

        for (table_index, table) in common_data.tables.iter().enumerate() {
            if !table.checked {
                continue;
            }
            let table_name = table.name.clone();
            let create_table_sql = format!(
                "SELECT sql
FROM sqlite_master
WHERE type = 'table' AND name = '{}';",
                table_name
            );
            let table_ddl: String = sqlx::query(&create_table_sql)
                .fetch_optional(&mut conn)
                .await?
                .ok_or(anyhow!("Not found table"))?
                .try_get(0)?;
            let mut dump_database_res_item = DumpDatabaseResItem::new();
            dump_database_res_item.table_struct = table_ddl.clone();
            if dump_database_req.export_option.is_export_data() {
                let selected_column = common_data.columns[table_index]
                    .iter()
                    .filter(|x| x.checked)
                    .map(|x| x.column_name.clone())
                    .join(",");
                let sql = format!("select {} from {}", selected_column, table_name.clone());
                let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
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
                            info!(
                                "column_name: {}, column_type: {},table:{}",
                                column_name, column_type, table_name
                            );
                            let column_value = sqlite_row_to_json(item, column_type, i)?;
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
        let dump_database_res = DumpDatabaseRes::from(DumpTableList::from(dump_data_list));
        dump_database_res.export_to_file(dump_database_req)?;
        Ok(())
    }
    pub async fn drop_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let table_name: String = level_infos[2].config_value.clone();
        let sql: String = format!("DROP TABLE IF EXISTS {};", table_name);
        sqlx::query(&sql).execute(&mut conn).await?;
        Ok(())
    }
    pub async fn drop_index(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let index_name: String = level_infos[4].config_value.clone();
        let sql: String = format!("DROP INDEX IF EXISTS {};", index_name);
        sqlx::query(&sql).execute(&mut conn).await?;
        Ok(())
    }
    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let table_name: String = level_infos[2].config_value.clone();

        let sql: String = format!("PRAGMA table_info({})", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;

        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for i in 0..first_item.columns().len() {
            let raw = first_item.try_get_raw(i)?;
            let type_info = raw.type_info();
            let type_name = type_info.name();
            let column_name = first_item.columns()[i].name();
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_lowercase(),
            });
        }

        info!("headers: {:?}", headers);
        let mut response_rows = vec![];
        for item in rows.iter() {
            let raw = item.try_get_raw(1)?;
            let type_info = raw.type_info();
            let type_name = type_info.name();
            let column_name =
                serde_value_to_string(sqlite_row_to_json(item, type_name, 1)?).unwrap_or_default();
            let raw = item.try_get_raw(2)?;
            let type_info = raw.type_info();
            let type_name = type_info.name();
            let column_type =
                serde_value_to_string(sqlite_row_to_json(item, type_name, 2)?).unwrap_or_default();

            let type_flag = ColumnTypeFlag::from(column_type.clone());
            let get_column_info_for_is_response_item = GetColumnInfoForInsertSqlResponseItem::from(
                column_name,
                column_type,
                type_flag,
                false,
            );

            response_rows.push(get_column_info_for_is_response_item);
        }
        Ok(GetColumnInfoForInsertSqlResponse::from(response_rows))
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        if !Path::new(&self.file_path).exists() {
            return Err(anyhow!("File not found !"));
        }
        info!("path is {}", self.file_path);
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        sqlx::query("SELECT name FROM sqlite_master LIMIT 1")
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not valid database file."))?;
        Ok(())
    }
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        Ok(self.file_path.clone())
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];

        info!("sqlite list_node_info_req: {:?}", list_node_info_req);
        ensure!(!self.file_path.is_empty(), "File not found !");
        let level_infos = list_node_info_req.level_infos;
        if level_infos.len() == 1 {
            let mut conn = SqliteConnection::connect(&self.file_path).await?;

            let tables_count: i32 = sqlx::query(
                "SELECT COUNT(*) 
FROM sqlite_master 
WHERE type = 'table' and name !='sqlite_sequence';",
            )
            .fetch_one(&mut conn)
            .await?
            .try_get(0)?;
            for (name, icon_name) in get_sqlite_root_data().iter() {
                let description = if *name == "Tables" && tables_count > 0 {
                    Some(format!("({})", tables_count))
                } else {
                    None
                };
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    icon_name.to_string(),
                    name.to_string(),
                    description,
                );
                vec.push(list_node_info_response_item);
            }
        } else if level_infos.len() == 2 {
            let base_config_id = level_infos[0].config_value.parse::<i32>()?;

            let node_name = level_infos[1].config_value.clone();

            info!("node_name: {},base_config_id:{}", node_name, base_config_id);
            if node_name == "Tables" {
                let mut conn = SqliteConnection::connect(&self.file_path).await?;
                let rows = sqlx::query(r#"SELECT name FROM sqlite_master WHERE type='table' and name!='sqlite_sequence'"#)
                    .fetch_all(&mut conn)
                    .await?;
                for row in rows {
                    let row_str: String = row.try_get(0)?;
                    let sql = format!("select count(*) from {}", row_str.clone());
                    info!("sql: {}", sql);
                    let record_count: i32 =
                        sqlx::query(&sql).fetch_one(&mut conn).await?.try_get(0)?;
                    let description = if record_count > 0 {
                        Some(format!("{}", record_count))
                    } else {
                        None
                    };
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "singleTable".to_string(),
                        row_str,
                        description,
                    );
                    vec.push(list_node_info_response_item);
                }
            } else if node_name == "Query" {
                let rows = sqlx::query("select query_name from sql_query where connection_id=?1")
                    .bind(base_config_id)
                    .fetch_all(&appstate.pool)
                    .await?;
                info!("row length:{}", rows.len());
                for row in rows {
                    let row_str: String = row.try_get(0)?;
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        false,
                        true,
                        "singleQuery".to_string(),
                        row_str,
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }
                info!("vec: {:?}", vec);
            } else if node_name == "Views" {
                let mut conn = SqliteConnection::connect(&self.file_path).await?;

                let rows = sqlx::query(
                    "SELECT name, sql 
FROM sqlite_master 
WHERE type = 'view';",
                )
                .fetch_all(&mut conn)
                .await?;
                info!("row length:{}", rows.len());
                for row in rows {
                    let row_str: String = row.try_get(0)?;
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "singleTable".to_string(),
                        row_str,
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }
                info!("vec: {:?}", vec);
            }
        } else if level_infos.len() == 3 {
            for (name, icon_name) in get_sqlite_table_data().iter() {
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    icon_name.to_string(),
                    name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            }
        } else if level_infos.len() == 4 {
            let table_name = level_infos[2].config_value.clone();
            let node_name = level_infos[3].config_value.clone();

            if node_name == "Columns" {
                let query = format!("PRAGMA table_info({})", table_name);
                let mut conn = SqliteConnection::connect(&self.file_path).await?;
                let rows = sqlx::query(&query).fetch_all(&mut conn).await?;
                for item in rows {
                    let buf: &[u8] = item.try_get(1)?;
                    let type_bytes: &[u8] = item.try_get(2)?;
                    let type_name = String::from_utf8_lossy(type_bytes).to_string();
                    let key: i32 = item.try_get(5)?;
                    if key > 0 {
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "primary".to_string(),
                            String::from_utf8_lossy(buf).to_string(),
                            Some(type_name),
                        );
                        vec.push(list_node_info_response_item);
                    } else {
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "column".to_string(),
                            String::from_utf8_lossy(buf).to_string(),
                            Some(type_name),
                        );
                        vec.push(list_node_info_response_item);
                    }
                }
            } else if node_name == "Index" {
                let query = format!("PRAGMA index_list({})", table_name);
                let mut conn = SqliteConnection::connect(&self.file_path).await?;
                let rows = sqlx::query(&query).fetch_all(&mut conn).await?;
                for item in rows {
                    let buf: &[u8] = item.try_get(1)?;
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        false,
                        true,
                        "singleCommonIndex".to_string(),
                        String::from_utf8_lossy(buf).to_string(),
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }
            }
        }
        Ok(ListNodeInfoResponse::new(vec))
    }
    async fn get_primary_column(
        conn: &mut sqlx::SqliteConnection,
        table_name: &str,
    ) -> Option<String> {
        let sql = format!(r#"PRAGMA table_info({})"#, table_name);
        let rows = sqlx::query(&sql).fetch_all(conn).await.ok()?;

        for row in rows {
            let primary_column: i32 = row.try_get("pk").ok()?;
            if primary_column > 0 {
                let name: String = row.try_get("name").ok()?;
                return Some(name); // Return the column name as soon as a primary key is found
            }
        }

        None // Return None if no primary key is found
    }
    pub async fn exe_sql(
        &self,
        _list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        info!("sql: {}", sql);
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let sql_parse_result = SqlParseResult::new(sql.clone())?;
        let is_simple_select_option = sql_parse_result.is_simple_select()?;
        let primary_column_option = if let Some(table_name) = &is_simple_select_option {
            SqliteConfig::get_primary_column(&mut conn, table_name).await
        } else {
            None
        };
        let has_multi_rows = sql_parse_result.has_multiple_rows()?;
        info!("has_multi_rows: {}", has_multi_rows);
        if !has_multi_rows {
            let mysql_query_result = sqlx::query(&sql).execute(&mut conn).await?;
            let headers = vec![
                Header {
                    name: "affected_rows".to_string(),
                    type_name: "u64".to_string().to_uppercase(),
                    is_primary_key: false,
                },
                Header {
                    name: "last_insert_id".to_string(),
                    type_name: "i64".to_string().to_uppercase(),
                    is_primary_key: false,
                },
            ];
            let rows = vec![vec![
                Some(mysql_query_result.rows_affected().to_string()),
                Some(mysql_query_result.last_insert_rowid().to_string()),
            ]];
            return Ok(ExeSqlResponse {
                header: headers,
                rows,
                table_name: is_simple_select_option,
            });
        }
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;

        info!("rows: {}", rows.len());
        if rows.is_empty() {
            return Ok(ExeSqlResponse::new());
        }
        info!("rows: {:?}", rows[0].column(0));
        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for i in 0..first_item.columns().len() {
            let raw = first_item.try_get_raw(i)?;
            let type_info = raw.type_info();
            let type_name = type_info.name();
            let column_name = first_item.column(i).name();
            let is_primary = if let Some(primary_column) = &primary_column_option {
                column_name == primary_column
            } else {
                false
            };
            headers.push(Header {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_uppercase(),
                is_primary_key: is_primary,
            });
        }
        info!("headers: {:?}", headers);
        let mut response_rows = vec![];
        // info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let raw = item.try_get_raw(i)?;
                let type_info = raw.type_info();
                let type_name = type_info.name();
                let val = sqlite_row_to_json(item, type_name, i)?;
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
        let exe_sql_response =
            ExeSqlResponse::from(headers, response_rows, is_simple_select_option);

        Ok(exe_sql_response)
    }
    pub async fn update_record(
        &self,
        _list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let mut vec = vec![];
        for sql in sqls {
            info!("sql: {}", sql);
            let result = conn.execute(&*sql).await.map_err(|e| anyhow!(e));
            if let Err(err) = result {
                vec.push(err.to_string())
            }
        }
        if !vec.is_empty() {
            let error_mes = vec.join(";");
            return Err(anyhow!(error_mes));
        }

        Ok(())
    }
    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let table_name: String = level_infos[2].config_value.clone();
        let mut conn = SqliteConnection::connect(&self.file_path).await?;

        let sql: String = format!(
            r#"SELECT sql FROM sqlite_master where name='{}'"#,
            table_name
        );
        let row = sqlx::query(&sql)
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(0)?;
        Ok(ddl)
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let table_name: String = level_infos[2].config_value.clone();

        let sql: String = format!("PRAGMA table_info({})", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;

        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for item in first_item.columns() {
            let type_name = item.type_info().name();
            let column_name = item.name();
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_uppercase(),
            });
        }
        info!("headers: {:?}", headers);
        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for i in 0..first_item.columns().len() {
            let raw = first_item.try_get_raw(i)?;
            let type_info = raw.type_info();
            let type_name = type_info.name();
            let column_name = first_item.columns()[i].name();
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_lowercase(),
            });
        }

        info!("headers: {:?}", headers);
        let mut response_rows = vec![];
        // info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let raw = item.try_get_raw(i)?;
                let type_info = raw.type_info();
                let type_name = type_info.name();

                let val = sqlite_row_to_json(item, type_name, i)?;
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
        let exe_sql_response = ShowColumnsResponse::from(headers, response_rows);
        Ok(exe_sql_response)
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;

        let row_option =
            sqlx::query("select words,datatime from complete_words where connection_id=?1")
                .bind(base_config_id)
                .fetch_optional(&appstate.pool)
                .await?;
        if let Some(row) = row_option {
            let words: String = row.try_get(0)?;
            let word_list = words.split(",").map(|item| item.to_string()).collect();
            return Ok(word_list);
        }
        let mut conn = SqliteConnection::connect(&self.file_path).await?;

        let table_rows = sqlx::query("SELECT distinct tbl_name from sqlite_master order by 1")
            .fetch_all(&mut conn)
            .await?;
        let mut set = HashSet::new();
        for table_row in table_rows {
            let table_byes: Vec<u8> = table_row.try_get(0)?;
            let table: String = String::from_utf8(table_byes)?;
            let use_database_sql = format!(r#"PRAGMA table_info('{}')"#, table);
            set.insert(table.clone());
            let column_rows = sqlx::query(&use_database_sql).fetch_all(&mut conn).await?;
            for column_row in column_rows {
                let column_bytes: Vec<u8> = column_row.try_get(1)?;
                let column = String::from_utf8(column_bytes)?;
                set.insert(column.clone());
            }
        }
        let vec: Vec<String> = set.into_iter().collect();
        Ok(vec)
    }
}
