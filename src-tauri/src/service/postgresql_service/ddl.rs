use super::config::PostgresqlConfig;
use super::queries::generate_ddl;
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
        let sql = generate_ddl(schema_name, table_name);
        let row = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(0)?;
        Ok(ddl)
    }
}
