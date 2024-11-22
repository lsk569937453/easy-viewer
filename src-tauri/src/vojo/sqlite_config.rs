use std::collections::HashSet;
use std::path::Path;
use std::vec;

use super::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use super::list_node_info_response::ListNodeInfoResponse;
use crate::util::common_utils::serde_value_to_string;
use crate::util::sql_utils::sqlite_row_to_json;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::vojo::sql_parse_result::SqlParseResult;
use crate::AppState;
use anyhow::Ok;
use chrono::DateTime;
use chrono::Local;
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
    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
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

            let type_flag = if column_type != "DATE" { 0 } else { 1 };

            let get_column_info_for_is_response_item =
                GetColumnInfoForInsertSqlResponseItem::from(column_name, column_type, type_flag);

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
            let base_config_id = level_infos[0].config_value.parse::<i32>()?;
            let database_name = level_infos[1].config_value.clone();
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
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        info!("sql: {}", sql);
        let data = ExeSqlResponse::new();
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
    pub async fn update_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let data = ExeSqlResponse::new();
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
        appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
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
        appstate: &AppState,
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
            let datatime: DateTime<Local> = row.try_get(1)?;
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
