use super::config::PostgresqlConfig;
use super::queries::GET_SCHEMA_SQL;
use crate::sql_lite::connection::AppState;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::anyhow;
use sqlx::Column;
use sqlx::Executor;
use sqlx::Row;
use sqlx::TypeInfo;
use std::collections::HashSet;

impl PostgresqlConfig {
    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let mut vec = vec![];
        for sql in sqls {
            info!("sql: {}", sql);
            let result = conn
                .execute(sqlx::AssertSqlSafe(sql))
                .await
                .map_err(|e| anyhow!(e));
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
    pub async fn truncate_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let drop_index_sql = format!("TRUNCATE  TABLE {}.{};", schema_name, table_name);
        sqlx::query(sqlx::AssertSqlSafe(drop_index_sql))
            .execute(&mut conn)
            .await?;
        Ok(())
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let show_column_sql = format!(
            "SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{}' AND table_schema = '{}';",
            table_name, schema_name
        );
        let rows = sqlx::query(sqlx::AssertSqlSafe(show_column_sql))
            .fetch_all(&mut conn)
            .await?;
        if rows.is_empty() {
            return Ok(ShowColumnsResponse::new());
        }
        let first_row = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];

        for item in first_row.columns().iter() {
            let type_name = item.type_info().name();
            let column_name = item.name();
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_uppercase(),
            });
        }
        let mut response_rows = vec![];
        for item in rows.iter() {
            response_rows.push(super::rows::postgres_row_to_strings(item)?);
        }
        let exe_sql_response = ShowColumnsResponse::from(headers, response_rows);

        Ok(exe_sql_response)
    }
    pub async fn remove_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        column_name: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
        info!("remove_column sql: {}", sql);
        sqlx::query(sqlx::AssertSqlSafe(sql))
            .execute(&mut conn)
            .await?;

        Ok(())
    }
    pub async fn update_comment(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        new_comment: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("COMMENT ON TABLE {} IS '{}';", table_name, new_comment);
        info!("update comment sql: {}", sql);
        sqlx::query(sqlx::AssertSqlSafe(sql))
            .execute(&mut conn)
            .await?;

        Ok(())
    }
    pub async fn drop_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let column_name = level_infos[6].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let sql = format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
        info!("remove_column sql: {}", sql);
        let _ = sqlx::query(sqlx::AssertSqlSafe(sql))
            .execute(&mut conn)
            .await?;
        Ok(())
    }
    pub async fn drop_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let drop_index_sql = format!("DROP TABLE {}.{};", schema_name, table_name);
        sqlx::query(sqlx::AssertSqlSafe(drop_index_sql))
            .execute(&mut conn)
            .await?;
        Ok(())
    }
    pub async fn drop_index(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let index_name = level_infos[6].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let drop_index_sql = format!("DROP INDEX IF EXISTS {}.{};", schema_name, index_name);
        sqlx::query(sqlx::AssertSqlSafe(drop_index_sql))
            .execute(&mut conn)
            .await?;
        Ok(())
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let mut set = HashSet::new();

        let schema_names = sqlx::query(GET_SCHEMA_SQL)
            .fetch_all(&mut conn)
            .await?
            .iter()
            .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
            .collect::<Result<Vec<String>, anyhow::Error>>()?;
        for schema_name in schema_names {
            let get_tables_sql = format!(
                "SELECT table_name
FROM information_schema.tables
WHERE table_schema = '{}'
  AND table_type = 'BASE TABLE';",
                schema_name
            );
            set.insert(schema_name.clone());
            let table_names = sqlx::query(sqlx::AssertSqlSafe(get_tables_sql))
                .fetch_all(&mut conn)
                .await?
                .iter()
                .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
                .collect::<Result<Vec<String>, anyhow::Error>>()?;
            for table_name in table_names {
                set.insert(table_name.clone());
                let get_column_sql = format!(
                    "SELECT column_name
FROM information_schema.columns
WHERE table_schema = '{}'
  AND table_name = '{}';",
                    schema_name, table_name
                );
                let column_names = sqlx::query(sqlx::AssertSqlSafe(get_column_sql))
                    .fetch_all(&mut conn)
                    .await?
                    .iter()
                    .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
                    .collect::<Result<Vec<String>, anyhow::Error>>()?;
                for column_name in column_names {
                    set.insert(column_name);
                }
            }
        }
        let vec: Vec<String> = set.into_iter().collect();

        Ok(vec)
    }
}
