use super::config::PostgresqlConfig;
use crate::sql_lite::connection::AppState;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::sql_parse_result::SqlParseResult;
use anyhow::anyhow;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::PgConnection;
use sqlx::Row;
use sqlx::TypeInfo;

impl PostgresqlConfig {
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let connect_url = if level_infos.len() >= 2 {
            let database_name = level_infos[1].config_value.clone();
            self.connection_url_with_database(database_name)
        } else {
            self.config.to_url("postgres".to_string())
        };
        info!("connect_url: {}", connect_url);
        let mut conn = PgConnection::connect(&connect_url).await?;

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
            let sql = format!(
                r#"SELECT column_name
FROM information_schema.key_column_usage
WHERE table_name = '{}'
  AND constraint_name = (
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '{}'
        AND constraint_type = 'PRIMARY KEY'
  );"#,
                table_name, table_name
            );
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
            let pg_query_result =
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
            let rows = vec![vec![Some(pg_query_result.rows_affected().to_string())]];
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
            response_rows.push(super::rows::postgres_row_to_strings(item)?);
        }
        let exe_sql_response =
            ExeSqlResponse::from(headers, response_rows, is_simple_select_option);

        Ok(exe_sql_response)
    }
}
