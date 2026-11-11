use super::config::MysqlConfig;
use crate::sql_lite::connection::AppState;
use crate::util::common_utils::serde_value_to_string;
use crate::util::sql_utils::mysql_row_to_json;
use crate::vojo::get_column_info_for_is_response::ColumnTypeFlag;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use anyhow::Ok;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use sqlx::TypeInfo;

impl MysqlConfig {
    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;

        let sql = format!("show create table {}", table_name);
        let row = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(1)?;

        Ok(ddl)
    }

    pub async fn get_procedure_details(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let procedure_name = level_infos[3].config_value.clone();
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;

        let sql = format!("show create procedure {}", procedure_name);
        let res_row = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!(""))?;
        let query: String = res_row.try_get(2)?;

        Ok(query)
    }

    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        _: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
        let sql = format!("show columns from {}", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
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
            let type_flag = ColumnTypeFlag::from(column_type.clone());

            let key_type: String = item.try_get(3)?;
            let is_primary = key_type.eq("PRI");
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
}
