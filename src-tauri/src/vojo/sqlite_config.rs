use std::path::Path;
use std::vec;

use super::list_node_info_req::ListNodeInfoReq;
use crate::util::sql_utils::is_simple_select;
use crate::util::sql_utils::sqlite_row_to_json;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::AppState;
use anyhow::Ok;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::Row;
use sqlx::SqliteConnection;
use sqlx::TypeInfo;
use sqlx::ValueRef;
#[derive(Deserialize, Serialize, Clone)]
pub struct SqliteConfig {
    pub file_path: String,
}
impl SqliteConfig {
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
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let mut vec = vec![];

        info!("list_node_info_req: {:?}", list_node_info_req);
        let level_infos = list_node_info_req.level_infos;
        if level_infos.len() == 2 {
            let node_name = level_infos[1].config_value.clone();
            if node_name == "Tables" {
                let mut conn = SqliteConnection::connect(&self.file_path).await?;
                let rows = sqlx::query(r#"SELECT name FROM sqlite_master WHERE type='table' and name!='sqlite_sequence'"#)
                    .fetch_all(&mut conn)
                    .await?;
                for row in rows {
                    let row_str: String = row.try_get(0)?;
                    vec.push((row_str, "singleTable".to_string()));
                }
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
                    let key: i32 = item.try_get(5)?;
                    if key > 0 {
                        vec.push((
                            String::from_utf8_lossy(buf).to_string(),
                            "primary".to_string(),
                        ));
                    } else {
                        vec.push((
                            String::from_utf8_lossy(buf).to_string(),
                            "column".to_string(),
                        ));
                    }
                }
            }
        }
        Ok(vec)
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
        let data = ExeSqlResponse::new();
        let mut conn = SqliteConnection::connect(&self.file_path).await?;
        let is_simple_select_option = is_simple_select(&sql)?;
        let primary_column_option = if let Some(table_name) = &is_simple_select_option {
            SqliteConfig::get_primary_column(&mut conn, table_name).await
        } else {
            None
        };
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(ExeSqlResponse::new());
        }
        info!("rows: {:?}", rows[0].column(0));
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
        info!("headers: {:?}", headers);
        let mut response_rows = vec![];
        // info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let type_name = columns[i].type_info().name();
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
                let raw: sqlx::sqlite::SqliteValueRef<'_> = item.try_get_raw(i)?;
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
}
