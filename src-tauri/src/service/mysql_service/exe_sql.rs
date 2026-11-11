use super::config::MysqlConfig;
use crate::sql_lite::connection::AppState;
use crate::util::sql_utils::mysql_row_to_json;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::sql_parse_result::SqlParseResult;
use anyhow::Ok;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use sqlx::TypeInfo;

impl MysqlConfig {
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let mut conn = MySqlConnection::connect(&connection_url).await?;

        if level_infos.len() >= 2 {
            let database_name = level_infos[1].config_value.clone();

            let use_database_sql = format!("use {}", database_name);
            info!("use_database_sql: {}", use_database_sql);
            conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
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
            let option_row = sqlx::query(sqlx::AssertSqlSafe(sql))
                .fetch_optional(&mut conn)
                .await?;
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
                    conn.execute(sqlx::AssertSqlSafe(sql.clone())).await?
                } else {
                    sqlx::query(sqlx::AssertSqlSafe(sql))
                        .execute(&mut conn)
                        .await?
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
                total_count: None,
            });
        }
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
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
            for (i, _) in columns.iter().enumerate().take(len) {
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
}
