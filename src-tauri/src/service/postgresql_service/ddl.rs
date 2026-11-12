use super::config::PostgresqlConfig;
use super::queries::generate_ddl_columns_sql;
use crate::sql_lite::connection::AppState;
use crate::util::common_utils::serde_value_to_string;
use crate::util::sql_utils::postgres_row_to_json;
use crate::vojo::get_column_info_for_is_response::ColumnTypeFlag;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use anyhow::anyhow;
use sqlx::Column;
use sqlx::Row;
use sqlx::TypeInfo;

/// 单列的 DDL 片段：`column_name type[(len|prec,scale)][ NOT NULL]`
fn format_ddl_column(
    column_name: &str,
    data_type: &str,
    char_max_len: Option<i32>,
    numeric_precision: Option<i32>,
    numeric_scale: Option<i32>,
    is_nullable: &str,
) -> String {
    let mut result = format!("    {column_name} {data_type}");
    if let Some(len) = char_max_len {
        result = format!("{result}({len})");
    }
    if let Some(precision) = numeric_precision {
        let scale = numeric_scale.unwrap_or(0);
        result = format!("{result}({precision},{scale})");
    }
    if is_nullable.eq_ignore_ascii_case("NO") {
        result.push_str(" NOT NULL");
    }
    result
}

/// 查列元数据并在 Rust 侧拼 CREATE TABLE，避免 SQL 端的模式敏感语法。
pub(super) async fn fetch_create_table_ddl<'e, E>(
    executor: E,
    schema_name: &str,
    table_name: &str,
) -> Result<String, anyhow::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    let sql = generate_ddl_columns_sql(schema_name.to_string(), table_name.to_string());
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .fetch_all(executor)
        .await?;
    if rows.is_empty() {
        return Err(anyhow!("Not found table: {schema_name}.{table_name}"));
    }
    let columns = rows
        .iter()
        .map(|row| {
            let column_name: String = row.try_get(0)?;
            let data_type: String = row.try_get(1)?;
            let char_max_len: Option<i32> = row.try_get(2)?;
            let numeric_precision: Option<i32> = row.try_get(3)?;
            let numeric_scale: Option<i32> = row.try_get(4)?;
            let is_nullable: String = row.try_get(5)?;
            Ok::<String, anyhow::Error>(format_ddl_column(
                &column_name,
                &data_type,
                char_max_len,
                numeric_precision,
                numeric_scale,
                &is_nullable,
            ))
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(format!(
        "CREATE TABLE {schema_name}.{table_name} (\n{}\n);",
        columns.join(",\n")
    ))
}

#[cfg(test)]
mod tests {
    use super::format_ddl_column;

    #[test]
    fn test_format_ddl_column_variants() {
        let varchar = format_ddl_column("name", "character varying", Some(64), None, None, "NO");
        assert_eq!(varchar, "    name character varying(64) NOT NULL");

        let numeric = format_ddl_column("price", "numeric", None, Some(10), Some(2), "YES");
        assert_eq!(numeric, "    price numeric(10,2)");

        let plain = format_ddl_column("flag", "integer", None, None, None, "YES");
        assert_eq!(plain, "    flag integer");
    }
}

impl PostgresqlConfig {
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
            "SELECT c.column_name,
       c.data_type,
       c.is_nullable,
       c.column_default,
       CASE
           WHEN pk.column_name IS NOT NULL THEN 'YES'
           ELSE 'NO'
       END AS is_primary_key
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage pk
    ON c.column_name = pk.column_name
    AND c.table_name = pk.table_name
    AND c.table_schema = pk.table_schema
LEFT JOIN information_schema.table_constraints t
    ON pk.constraint_name = t.constraint_name
    AND t.constraint_type = 'PRIMARY KEY'
WHERE c.table_schema = '{}'  
  AND c.table_name = '{}';",
            schema_name, table_name
        );
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
        let mut response_rows = vec![];
        info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let type_name = columns[0].type_info().name();
            let column_name = serde_value_to_string(postgres_row_to_json(item, type_name, 0)?)
                .unwrap_or_default();
            let type_name = columns[1].type_info().name();
            let column_type = serde_value_to_string(postgres_row_to_json(item, type_name, 1)?)
                .unwrap_or_default();
            let type_flag = ColumnTypeFlag::from(column_type.clone());

            let key_type: String = item.try_get(4)?;
            let is_primary = key_type == "YES";
            let get_column_info_for_is_response_item = GetColumnInfoForInsertSqlResponseItem::from(
                column_name,
                column_type,
                type_flag,
                is_primary,
            );

            response_rows.push(get_column_info_for_is_response_item);
        }
        Ok(GetColumnInfoForInsertSqlResponse::from(response_rows))
    }

    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let ddl = fetch_create_table_ddl(&mut conn, &schema_name, &table_name).await?;
        Ok(ddl)
    }
}
