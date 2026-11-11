use super::config::MysqlConfig;
use crate::service::mysql_common_service::show_column_info;
use crate::sql_lite::connection::AppState;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::Ok;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use std::collections::HashSet;

impl MysqlConfig {
    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
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
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
        let drop_sql = format!("TRUNCATE  TABLE  {}", table_name);
        info!("drop_sql: {}", drop_sql);
        conn.execute(sqlx::AssertSqlSafe(drop_sql)).await?;

        Ok(())
    }

    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
        let exe_sql_response = show_column_info(&mut conn, table_name).await?;

        Ok(exe_sql_response)
    }

    pub async fn remove_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        column_name: String,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let table_name = level_infos[3].config_value.clone();
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;

        let sql = format!(
            "ALTER TABLE {}
DROP COLUMN {};",
            table_name, column_name
        );
        let _ = sqlx::query(sqlx::AssertSqlSafe(sql))
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
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let table_name = level_infos[3].config_value.clone();
        let database_name = level_infos[1].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;

        let sql = format!("ALTER TABLE {} COMMENT = '{}';", table_name, new_comment);
        let _ = sqlx::query(sqlx::AssertSqlSafe(sql))
            .execute(&mut conn)
            .await?;

        Ok(())
    }

    pub async fn move_column(
        &self,
        _appstate: &AppState,
        list_node_info_req: ListNodeInfoReq,
        move_direction: i32,
    ) -> Result<String, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let source_column_name = level_infos[5].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;

        let sql = format!("show columns from {}", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
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
        conn.execute(sqlx::AssertSqlSafe(alter_table_sql)).await?;
        Ok("()".to_string())
    }

    pub async fn drop_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
        let drop_sql = format!("drop table {}", table_name);
        info!("drop_sql: {}", drop_sql);
        conn.execute(sqlx::AssertSqlSafe(drop_sql)).await?;

        Ok(())
    }

    pub async fn drop_index(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let source_index_name = level_infos[5].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
        let sql = format!("SHOW INDEX FROM {};", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
        let mut drop_sql = String::new();
        for item in rows {
            let key_name: String = item.try_get(2)?;
            info!("index_name: {}", key_name);

            if key_name == source_index_name {
                if key_name == "PRIMARY" {
                    drop_sql = format!("ALTER TABLE {} DROP PRIMARY KEY;", table_name.clone());
                } else {
                    drop_sql = format!(
                        "ALTER TABLE {} DROP INDEX {};",
                        table_name.clone(),
                        key_name
                    );
                }
                break;
            }
        }
        info!("drop_sql: {}", drop_sql);
        conn.execute(sqlx::AssertSqlSafe(drop_sql)).await?;

        Ok(())
    }

    pub async fn drop_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let column_name = level_infos[5].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(sqlx::AssertSqlSafe(use_database_sql)).await?;
        let drop_sql = format!(
            "ALTER TABLE {} DROP COLUMN {};",
            table_name.clone(),
            column_name
        );
        info!("drop_sql: {}", drop_sql);
        conn.execute(sqlx::AssertSqlSafe(drop_sql)).await?;

        Ok(())
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
            new_conn
                .execute(sqlx::AssertSqlSafe(use_database_sql))
                .await?;

            set.insert(database.clone());
            let table_rows = sqlx::query("show tables").fetch_all(&mut new_conn).await?;
            info!("table_rows: {},database: {}", table_rows.len(), database);
            for table in table_rows {
                let table_bytes: Vec<u8> = table.try_get(0)?;
                let table = String::from_utf8(table_bytes)?;
                set.insert(table.clone());

                let sql = format!("SHOW COLUMNS FROM `{}` ", table);

                let column_row = sqlx::query(sqlx::AssertSqlSafe(sql))
                    .fetch_all(&mut new_conn)
                    .await?;
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
}
