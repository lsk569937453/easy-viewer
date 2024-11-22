use std::collections::HashSet;
use std::vec;

use super::exe_sql_response::ExeSqlResponse;
use super::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use crate::sql_lite::connection::AppState;
use crate::util::common_utils::serde_value_to_string;
use crate::util::sql_utils::mysql_row_to_json;
use crate::vojo::base_config::DatabaseHostStruct;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::vojo::sql_parse_result::SqlParseResult;
use anyhow::Ok;
use bigdecimal::BigDecimal;
use chrono::DateTime;
use chrono::Local;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use sqlx::TypeInfo;
use std::sync::OnceLock;

static MYSQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
static MYSQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_mysql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MYSQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
fn get_mysql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MYSQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map.insert("Partitions", "partitions");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MysqlConfig {
    pub config: DatabaseHostStruct,
}
impl MysqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mysql".to_string());
        MySqlConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }
    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;
        let sql = format!("show columns from {}", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(GetColumnInfoForInsertSqlResponse::new());
        }
        let mut response_rows = vec![];
        for item in rows.iter() {
            let columns = item.columns();
            let type_name = columns[0].type_info().name();
            let column_name =
                serde_value_to_string(mysql_row_to_json(item, type_name, 0)?).unwrap_or_default();
            let type_name = columns[1].type_info().name();
            let column_type =
                serde_value_to_string(mysql_row_to_json(item, type_name, 1)?).unwrap_or_default();
            let type_flag = if column_type != "date" { 0 } else { 1 };
            let get_column_info_for_is_response_item =
                GetColumnInfoForInsertSqlResponseItem::from(column_name, column_type, type_flag);

            response_rows.push(get_column_info_for_is_response_item);
        }

        Ok(GetColumnInfoForInsertSqlResponse::from(response_rows))
    }
    pub async fn list_node_info(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let mut conn = MySqlConnection::connect(&connection_url).await?;

                let rows = sqlx::query(
                    "SELECT `schema_name`
from INFORMATION_SCHEMA.SCHEMATA
WHERE
    `schema_name` NOT IN(
        'information_schema',
        'mysql',
        'performance_schema'
    );",
                )
                .fetch_all(&mut conn)
                .await?;

                for item in rows {
                    let buf: &[u8] = item.try_get(0)?;
                    let database_name = String::from_utf8_lossy(buf);
                    let query_db_size_sql = format!(
                        r#"SELECT table_schema AS "Database",
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "Size (MB)"
FROM information_schema.tables
WHERE table_schema = "{}";"#,
                        database_name
                    );
                    let query_size_result = sqlx::query(&query_db_size_sql)
                        .fetch_optional(&mut conn)
                        .await?
                        .ok_or(anyhow!(""))?;
                    let db_size_option: Option<BigDecimal> = query_size_result.try_get(1)?;

                    let db_size_str = if let Some(db_size) = db_size_option {
                        format!("{}M", db_size)
                    } else {
                        "".to_string()
                    };

                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "database".to_string(),
                        database_name.to_string(),
                        Some(db_size_str),
                    );
                    vec.push(list_node_info_response_item);
                }
                info!("list_node_info: {:?}", vec);
                return Ok(ListNodeInfoResponse::new(vec));
            }
            2 => {
                let mut conn = MySqlConnection::connect(&connection_url).await?;
                let database_name = level_infos[1].config_value.clone();
                let sql = format!("use {}", database_name);
                info!("sql: {}", sql);
                conn.execute(&*sql).await?;
                let tables_count: i32 = sqlx::query(
                    "SELECT COUNT(*) 
FROM information_schema.tables
WHERE table_schema = DATABASE()",
                )
                .fetch_optional(&mut conn)
                .await?
                .ok_or(anyhow!(""))?
                .try_get(0)?;
                for (name, icon_name) in get_mysql_database_data().iter() {
                    let description = if *name == "Tables" && tables_count > 0 {
                        Some(format!("({})", tables_count))
                    } else {
                        None
                    };
                    info!("description: {}", tables_count);
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        icon_name.to_string(),
                        name.to_string(),
                        description,
                    );
                    vec.push(list_node_info_response_item);
                }
            }
            3 => {
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let database_name = level_infos[1].config_value.clone();
                let node_name = level_infos[2].config_value.clone();
                if node_name == "Tables" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;

                    let sql = format!("use {}", database_name.clone());
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;

                    let rows = sqlx::query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';")
                        .fetch_all(&mut conn)
                        .await?;

                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        let table_name = String::from_utf8_lossy(buf).to_string();
                        let sql = format!(
                            "select count(*) from {}.{}",
                            database_name.clone(),
                            table_name.clone()
                        );
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
                            table_name,
                            description,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Query" {
                    let rows =
                        sqlx::query("select query_name from sql_query where connection_id=?1")
                            .bind(base_config_id)
                            .fetch_all(&appstate.pool)
                            .await?;
                    let mut vec = vec![];
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

                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Procedures" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;

                    let sql = format!("use {}", database_name.clone());
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    let rows = sqlx::query("SHOW PROCEDURE STATUS")
                        .fetch_all(&mut conn)
                        .await?;
                    let database_name = level_infos[1].config_value.clone();

                    let mut vec = vec![];
                    for row in rows {
                        let db_str_bytes: Vec<u8> = row.try_get(0)?;
                        let row_str: String = row.try_get(1)?;
                        let db_str = String::from_utf8_lossy(&db_str_bytes);
                        if db_str != database_name {
                            continue;
                        }
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singleProcedure".to_string(),
                            row_str,
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    }

                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Views" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;

                    let sql = format!("use {}", database_name.clone());
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    let rows = sqlx::query("SHOW FULL TABLES WHERE Table_type = 'VIEW';")
                        .fetch_all(&mut conn)
                        .await?;
                    let database_name = level_infos[1].config_value.clone();

                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        let table_name = String::from_utf8_lossy(buf).to_string();
                        let sql = format!(
                            "select count(*) from {}.{}",
                            database_name.clone(),
                            table_name.clone()
                        );
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
                            table_name,
                            description,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Functions" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;

                    let sql = format!("use {}", database_name.clone());
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    let list_functions_sql = format!(
                        "SELECT ROUTINE_NAME, ROUTINE_TYPE, DATA_TYPE, CREATED, LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
  AND ROUTINE_SCHEMA = '{}';",
                        database_name.clone()
                    );
                    let rows = sqlx::query(&list_functions_sql)
                        .fetch_all(&mut conn)
                        .await?;

                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        let function_name = String::from_utf8_lossy(buf).to_string();

                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singleFunction".to_string(),
                            function_name,
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                }
            }
            4 => {
                for (name, icon_name) in get_mysql_table_data().iter() {
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        icon_name.to_string(),
                        name.to_string(),
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }
            }
            5 => {
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let database_name = level_infos[1].config_value.clone();
                let table_name = level_infos[3].config_value.clone();
                let node_name = level_infos[4].config_value.clone();

                if node_name == "Columns" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;
                    let mut sql = format!("use {}", database_name);
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    sql = format!("describe {};", table_name);
                    info!("sql: {}", sql);
                    let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        let type_bytes: &[u8] = item.try_get(1)?;
                        let type_name = String::from_utf8_lossy(type_bytes).to_string();
                        let key: &[u8] = item.try_get(3)?;
                        info!("key: {}", String::from_utf8_lossy(key).to_string());
                        if key == b"PRI" {
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
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Index" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;
                    let mut sql = format!("use {}", database_name);
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    sql = format!("SHOW INDEX FROM {};", table_name);
                    info!("sql: {}", sql);
                    let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                    for item in rows {
                        let index_name: String = item.try_get(2)?;
                        if index_name == "PRIMARY" {
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "singlePrimaryIndex".to_string(),
                                index_name,
                                None,
                            );
                            vec.push(list_node_info_response_item);
                        } else {
                            // vec.push((index_name, "singleCommonIndex".to_string(), None));
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "singleCommonIndex".to_string(),
                                index_name,
                                None,
                            );
                            vec.push(list_node_info_response_item);
                        }
                    }
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }

            _ => {}
        }

        Ok(ListNodeInfoResponse::new(vec))
    }

    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let mut conn = MySqlConnection::connect(&connection_url).await?;

        if level_infos.len() >= 2 {
            let database_name = level_infos[1].config_value.clone();

            let use_database_sql = format!("use {}", database_name);
            info!("use_database_sql: {}", use_database_sql);
            conn.execute(&*use_database_sql).await?;
        }
        info!("sql: {}", sql);
        let should_parse_sql = !(sql.contains("CREATE DATABASE")
            || (sql.contains("CREATE PROCEDURE") && !sql.contains("SHOW CREATE PROCEDURE"))
            || sql.contains("CREATE FUNCTION") && !sql.contains("SHOW CREATE FUNCTION"));
        info!(
            "should_parse_sql: {},{}",
            should_parse_sql,
            !sql.contains("CREATE PROCEDURE")
        );
        let (is_simple_select_option, has_multi_rows) = if should_parse_sql {
            let sql_parse_result = SqlParseResult::new(sql.clone())?;
            (
                sql_parse_result.is_simple_select()?,
                sql_parse_result.has_multiple_rows()?,
            )
        } else {
            (None, false)
        };
        let primary_column_option = if let Some(table_name) = &is_simple_select_option {
            let sql = format!(r#"show columns from {}  where `Key` = "PRI""#, table_name);
            let option_row = sqlx::query(&sql).fetch_optional(&mut conn).await?;
            if let Some(row) = option_row {
                let primary_column: String = row.try_get(0)?;
                Some(primary_column)
            } else {
                None
            }
        } else {
            None
        };

        info!("has_multi_rows: {}", has_multi_rows);
        if !has_multi_rows {
            let mysql_query_result =
                if sql.contains("CREATE PROCEDURE") || sql.contains("CREATE FUNCTION") {
                    conn.execute(sql.as_str()).await?
                } else {
                    sqlx::query(&sql).execute(&mut conn).await?
                };
            let headers = vec![
                Header {
                    name: "affected_rows".to_string(),
                    type_name: "u64".to_string().to_uppercase(),
                    is_primary_key: false,
                },
                Header {
                    name: "last_insert_id".to_string(),
                    type_name: "u64".to_string().to_uppercase(),
                    is_primary_key: false,
                },
            ];
            let rows = vec![vec![
                Some(mysql_query_result.rows_affected().to_string()),
                Some(mysql_query_result.last_insert_id().to_string()),
            ]];
            return Ok(ExeSqlResponse {
                header: headers,
                rows,
                table_name: is_simple_select_option,
            });
        }
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(ExeSqlResponse::new());
        }
        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for item in first_item.columns() {
            let type_name = item.type_info().name();
            let column_name = item.name();
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
        let mut response_rows = vec![];
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let type_name = columns[i].type_info().name();
                let val = mysql_row_to_json(item, type_name, i)?;
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
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;
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
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;

        let sql = format!("show create table {}", table_name);
        let row = sqlx::query(&sql)
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(1)?;

        Ok(ddl)
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;
        let sql = format!("show columns from {}", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(ShowColumnsResponse::new());
        }
        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for (index, item) in first_item.columns().iter().enumerate() {
            info!("type_name: {:?}", item);
            let type_name = item.type_info().name();
            let column_name = item.name();
            if index == 2 {
                headers.push(ShowColumnHeader {
                    name: "Comment".to_string(),
                    type_name: "VARCHAR".to_string().to_uppercase(),
                });
            } else {
                headers.push(ShowColumnHeader {
                    name: column_name.to_string(),
                    type_name: type_name.to_string().to_uppercase(),
                });
            }
        }
        let mut response_rows = vec![];
        // info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let type_name = columns[i].type_info().name();
                let val = mysql_row_to_json(item, type_name, i)?;
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
    pub async fn move_column(
        &self,
        appstate: &AppState,
        list_node_info_req: ListNodeInfoReq,
        move_direction: i32,
    ) -> Result<String, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let source_column_name = level_infos[5].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;

        let sql = format!("show columns from {}", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        let mut column_list = vec![];
        for item in rows.iter() {
            let columns_name: String = item.try_get(0)?;
            let column_type_bytes: Vec<u8> = item.try_get(1)?;
            let column_type: String = String::from_utf8_lossy(&column_type_bytes).to_string();

            column_list.push((columns_name, column_type));
        }
        let first_element = column_list
            .first()
            .ok_or(anyhow!("Can not find first element"))?;
        let last_element = column_list
            .last()
            .ok_or(anyhow!("Can not find last element"))?;
        ensure!(
            !(source_column_name == first_element.0 && move_direction == -1),
            "The first column cannot be moved up."
        );
        ensure!(
            !(source_column_name == last_element.0 && move_direction == 1),
            "The last column cannot be moved down."
        );
        let source_index = column_list
            .iter()
            .position(|item| item.0 == source_column_name)
            .ok_or(anyhow!("Can not find source column"))?;
        let new_index = source_index as i32 + move_direction;
        column_list.swap(source_index, new_index as usize);

        let target_column = if new_index == 0 {
            "FIRST".to_string()
        } else {
            format!("AFTER {}", column_list[new_index as usize - 1].0)
        };

        let alter_table_sql = format!(
            "ALTER TABLE {} MODIFY COLUMN {} {} {}",
            table_name, source_column_name, column_list[new_index as usize].1, target_column
        );

        info!("move_column sql: {}", alter_table_sql);
        conn.execute(&*alter_table_sql).await?;
        Ok("()".to_string())
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
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
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let database_rows = sqlx::query(
            "SHOW DATABASES
WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema')",
        )
        .fetch_all(&mut conn)
        .await?;
        let mut set = HashSet::new();
        for database_row in database_rows {
            let mut new_conn = MySqlConnection::connect(&connection_url).await?;

            let database_byte: Vec<u8> = database_row.try_get(0)?;
            let database: String = String::from_utf8(database_byte)?;
            let use_database_sql = format!("use {}", database);
            new_conn.execute(&*use_database_sql).await?;

            set.insert(database.clone());
            let table_rows = sqlx::query("show tables").fetch_all(&mut new_conn).await?;
            info!("table_rows: {},database: {}", table_rows.len(), database);
            for table in table_rows {
                let table_bytes: Vec<u8> = table.try_get(0)?;
                let table = String::from_utf8(table_bytes)?;
                set.insert(table.clone());

                let sql = format!("SHOW COLUMNS FROM `{}` ", table);

                let column_row = sqlx::query(&sql).fetch_all(&mut new_conn).await?;
                for item in column_row {
                    let columns: String = item.try_get(0)?;
                    set.insert(columns.clone());
                }
            }
            let rows = sqlx::query("SHOW PROCEDURE STATUS")
                .fetch_all(&mut conn)
                .await?;

            for row in rows {
                let db_str_bytes: Vec<u8> = row.try_get(0)?;
                let row_str: String = row.try_get(1)?;
                let db_str = String::from_utf8_lossy(&db_str_bytes);
                if db_str != database {
                    continue;
                }
                set.insert(row_str.clone());
            }
        }
        let vec: Vec<String> = set.into_iter().collect();
        info!("get_complete_words len: {}", vec.len());
        Ok(vec)
    }
    pub async fn get_procedure_details(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let procedure_name = level_infos[3].config_value.clone();

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let conn = MySqlConnection::connect(&connection_url).await?;

        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;

        let sql = format!("show create procedure {}", procedure_name);
        let res_row = sqlx::query(&sql)
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!(""))?;
        let query: String = res_row.try_get(2)?;

        Ok(query)
    }
}
