use super::config::MssqlConfig;
use super::queries::get_schema_sql;
use super::queries::get_table_sql;
use crate::util::sql_utils::mssql_row_to_json;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::ColumnTypeFlag;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::sql_parse_result::SqlParseResult;
use crate::AppState;
use anyhow::anyhow;
use futures_util::TryStreamExt;
use std::collections::HashSet;
use tiberius::QueryItem;

impl MssqlConfig {
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let mut conn = self
            .get_connection_with_database(database_name.clone())
            .await?;

        let mut set = HashSet::new();

        let schema_names_res = conn
            .query(get_schema_sql(database_name), &[])
            .await?
            .into_first_result()
            .await?;
        let schema_names = schema_names_res
            .iter()
            .map(|item| -> Result<&str, anyhow::Error> {
                item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
            });
        for item in schema_names {
            let schema_name = item?;

            set.insert(schema_name.to_string());
            let table_names_res = conn
                .query(get_table_sql(schema_name.to_string()), &[])
                .await?
                .into_first_result()
                .await?;
            let table_names = table_names_res
                .iter()
                .map(|item| -> Result<&str, anyhow::Error> {
                    item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
                });
            for table_name_item in table_names {
                let table_name = table_name_item?;
                set.insert(table_name.to_string());
                let get_column_sql = format!(
                    "SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '{}'
  AND TABLE_NAME = '{}';",
                    schema_name, table_name
                );
                let column_names_res = conn
                    .query(get_column_sql, &[])
                    .await?
                    .into_first_result()
                    .await?;
                let column_names =
                    column_names_res
                        .iter()
                        .map(|item| -> Result<&str, anyhow::Error> {
                            item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
                        });

                for column_name_item in column_names {
                    let column_name = column_name_item?;
                    set.insert(column_name.to_string());
                }
            }
        }
        let vec: Vec<String> = set.into_iter().collect();

        Ok(vec)
    }
    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let sql = format!(
            "SELECT 
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT,
    CASE
        WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS is_primary_key
FROM INFORMATION_SCHEMA.COLUMNS c
LEFT JOIN (
    SELECT 
        kcu.COLUMN_NAME,
        kcu.TABLE_NAME,
        kcu.TABLE_SCHEMA
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        AND kcu.TABLE_NAME = tc.TABLE_NAME
        AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
        AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
) pk
    ON c.COLUMN_NAME = pk.COLUMN_NAME
    AND c.TABLE_NAME = pk.TABLE_NAME
    AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
WHERE c.TABLE_SCHEMA = '{}' 
  AND c.TABLE_NAME = '{}';",
            schema_name, table_name
        );
        let rows = conn.query(&sql, &[]).await?.into_first_result().await?;
        let mut response_rows = vec![];
        info!("rows: {:?}", rows);
        for item in rows.iter() {
            let column_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
            let column_type: &str = item.try_get(1)?.ok_or(anyhow!(""))?;
            let key_type: &str = item.try_get(4)?.ok_or(anyhow!(""))?;
            let is_primary = key_type == "YES";

            let type_flag = ColumnTypeFlag::from(column_type.to_string().clone());

            let get_column_info_for_is_response_item = GetColumnInfoForInsertSqlResponseItem::from(
                column_name.to_string(),
                column_type.to_string(),
                type_flag,
                is_primary,
            );

            response_rows.push(get_column_info_for_is_response_item);
        }
        Ok(GetColumnInfoForInsertSqlResponse::from(response_rows))
    }
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let mut conn = if level_infos.len() >= 2 {
            let database_name = level_infos[1].config_value.clone();
            self.get_connection_with_database(database_name).await?
        } else {
            self.get_connection().await?
        };

        let should_parse_sql = !(sql.contains("CREATE DATABASE")
            || (sql.contains("CREATE PROCEDURE") && !sql.contains("SHOW CREATE PROCEDURE"))
            || sql.contains("CREATE FUNCTION") && !sql.contains("SHOW CREATE FUNCTION")
            || sql.contains("CREATE SCHEMA"));
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
            let stream = conn.query(&sql, &[]).await?;
            let row_option = stream.into_row().await?;

            if let Some(row) = row_option {
                let primary_column = row.try_get::<&str, _>(0)?.ok_or(anyhow!(""))?;
                Some(primary_column.to_string())
            } else {
                None
            }
        } else {
            None
        };

        info!("has_multi_rows: {}", has_multi_rows);
        if !has_multi_rows {
            let row_affected = if sql.contains("CREATE SCHEMA") {
                let _ = conn.simple_query(&sql).await?;
                "0".to_string()
            } else {
                let exe_res = conn.execute(&sql, &[]).await?;
                exe_res
                    .rows_affected()
                    .iter()
                    .map(|item| item.to_string())
                    .collect::<Vec<String>>()
                    .join(", ")
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

            let rows = vec![vec![Some(row_affected)]];
            return Ok(ExeSqlResponse {
                header: headers,
                rows,
                table_name: is_simple_select_option,
                total_count: None,
            });
        }
        let mut rows = conn.query(&sql, &[]).await?;
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
                        let is_primary = if let Some(primary_column) = primary_column_option.clone()
                        {
                            column_name == primary_column.as_str()
                        } else {
                            false
                        };
                        headers.push(Header {
                            name: column_name.to_string(),
                            type_name: type_name_str.to_uppercase(),
                            is_primary_key: is_primary,
                        });
                    }
                }
            }
        }

        let exe_sql_response =
            ExeSqlResponse::from(headers, response_rows, is_simple_select_option);

        Ok(exe_sql_response)
    }
}
