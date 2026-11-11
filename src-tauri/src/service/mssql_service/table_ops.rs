use super::config::MssqlConfig;
use super::queries::get_index_sql;
use crate::util::sql_utils::mssql_row_to_json;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::AppState;
use anyhow::anyhow;
use futures_util::TryStreamExt;
use tiberius::QueryItem;

impl MssqlConfig {
    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let _schema_name = level_infos[2].config_value.clone();

        let _table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let mut vec = vec![];
        for sql in sqls {
            info!("sql: {}", sql);
            let result = conn.execute(&*sql, &[]).await.map_err(|e| anyhow!(e));
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

        let sql = format!("TRUNCATE TABLE {}.{};", schema_name, table_name);
        info!("truncate_table  sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
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
            "SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{}' AND TABLE_SCHEMA = '{}';",
            table_name, schema_name
        );
        let mut rows = conn.query(&show_column_sql, &[]).await?;
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
                        headers.push(ShowColumnHeader {
                            name: column_name.to_string(),
                            type_name: type_name_str.to_uppercase(),
                        });
                    }
                }
            }
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
        let schema_name = level_infos[2].config_value.clone();

        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!(
            "ALTER TABLE {}.{} DROP COLUMN {};",
            schema_name, table_name, column_name
        );
        info!("remove_column sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
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
        let schema_name = level_infos[2].config_value.clone();

        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!(
            "EXEC sp_updateextendedproperty 
    @name = N'MS_Description', 
    @value = '{}', 
    @level0type = N'Schema', @level0name = '{}', 
    @level1type = N'Table', @level1name = '{}';",
            new_comment, schema_name, table_name
        );
        info!("update comment sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
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
        let drop_table_sql = format!("DROP TABLE {}.{};", schema_name, table_name);
        let _ = conn.execute(&drop_table_sql, &[]).await?;

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

        let table_name = level_infos[4].config_value.clone();
        let index_name = level_infos[6].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let show_index_sql = get_index_sql(schema_name.clone(), table_name.clone());
        let rows = conn
            .query(&show_index_sql, &[])
            .await?
            .into_first_result()
            .await?;
        let row = rows
            .iter()
            .find(|item| {
                item.try_get(0)
                    .ok()
                    .flatten()
                    .is_some_and(|value: &str| value == index_name)
            })
            .ok_or(anyhow!("Not found index"))?;
        let is_primary: bool = row.try_get(5)?.ok_or(anyhow!(""))?;
        let is_unique: bool = row.try_get(4)?.ok_or(anyhow!(""))?;

        let drop_sql = if is_primary || is_unique {
            format!(
                "ALTER TABLE {}.{} DROP CONSTRAINT {};",
                schema_name, table_name, index_name
            )
        } else {
            format!("DROP INDEX {}.{}.{};", schema_name, table_name, index_name)
        };

        info!("drop_sql sql: {}", drop_sql);
        let _ = conn.execute(&drop_sql, &[]).await?;
        Ok(())
    }
    pub async fn drop_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();

        let table_name = level_infos[4].config_value.clone();
        let column_name = level_infos[6].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!(
            "ALTER TABLE {}.{} DROP COLUMN {};",
            schema_name, table_name, column_name
        );
        info!("drop_column sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
        Ok(())
    }
}
