use super::config::PostgresqlConfig;
use super::queries::get_postgresql_database_data;
use super::queries::get_postgresql_table_data;
use super::queries::GET_SCHEMA_SQL;
use crate::sql_lite::connection::AppState;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use anyhow::anyhow;
use sqlx::PgConnection;
use sqlx::Row;

use crate::driver::node::expandable as expandable_node;
use crate::driver::node::leaf as leaf_node;
impl PostgresqlConfig {
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let items = match list_node_info_req.level_infos.len() {
            1 => self.list_database_nodes().await?,
            2 => self.list_schema_nodes(&list_node_info_req).await?,
            3 => self.list_schema_category_nodes(&list_node_info_req).await?,
            4 => {
                self.list_section_nodes(&list_node_info_req, appstate)
                    .await?
            }
            5 => list_table_category_nodes(),
            6 => self.list_table_child_nodes(&list_node_info_req).await?,
            _ => vec![],
        };
        Ok(ListNodeInfoResponse::new(items))
    }

    async fn list_database_nodes(&self) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let mut connection = self.get_connection().await?;

        let rows = sqlx::query("SELECT datname FROM pg_database WHERE datistemplate = false;")
            .fetch_all(&mut connection)
            .await?;

        if rows.is_empty() {
            return Ok(vec![]);
        }
        let mut vec = vec![];
        for item in rows.iter() {
            let database_name: String = item.try_get(0)?;
            let sql = format!(
                "SELECT pg_size_pretty(pg_database_size('{}')) AS database_size;",
                database_name
            );
            let db_size_row = sqlx::query(sqlx::AssertSqlSafe(sql))
                .fetch_optional(&mut connection)
                .await?
                .ok_or(anyhow!("Not found"))?;
            let description: String = db_size_row.try_get(0)?;
            vec.push(expandable_node(
                "database",
                database_name.to_string(),
                Some(description),
            ));
        }
        vec.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(vec)
    }

    async fn list_schema_nodes(
        &self,
        list_node_info_req: &ListNodeInfoReq,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let database_name = list_node_info_req.level_infos[1].config_value.clone();
        let mut connection = self.get_connection_with_database(database_name).await?;
        let rows = sqlx::query(GET_SCHEMA_SQL)
            .fetch_all(&mut connection)
            .await?;
        if rows.is_empty() {
            return Ok(vec![]);
        }
        let mut vec = vec![];
        for item in rows.iter() {
            let schema_name: String = item.try_get(0)?;
            vec.push(expandable_node("public", schema_name, None));
        }
        Ok(vec)
    }

    async fn list_schema_category_nodes(
        &self,
        list_node_info_req: &ListNodeInfoReq,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let database_name = list_node_info_req.level_infos[1].config_value.clone();
        let schema_name = list_node_info_req.level_infos[2].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let tables_count = count_schema_tables(&mut conn, &schema_name).await?;
        let mut vec = vec![];
        for (name, icon_name) in get_postgresql_database_data().iter() {
            let description = if *name == "Tables" && tables_count > 0 {
                Some(format!("({})", tables_count))
            } else {
                None
            };
            vec.push(expandable_node(icon_name, name.to_string(), description));
        }
        Ok(vec)
    }

    async fn list_section_nodes(
        &self,
        list_node_info_req: &ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let node_name = list_node_info_req.level_infos[3].config_value.clone();
        let schema_name = list_node_info_req.level_infos[2].config_value.clone();
        let base_config_id = list_node_info_req.level_infos[0]
            .config_value
            .parse::<i32>()?;

        if node_name == "Tables" {
            let database_name = list_node_info_req.level_infos[1].config_value.clone();
            return self
                .list_schema_table_nodes(database_name, schema_name)
                .await;
        }
        if node_name == "Query" {
            return crate::driver::node::query_nodes(appstate, base_config_id).await.map_err(Into::into);
        }
        Ok(vec![])
    }

    async fn list_schema_table_nodes(
        &self,
        database_name: String,
        schema_name: String,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let mut connection = self.get_connection_with_database(database_name).await?;
        let sql = format!(
            "SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname = '{}';",
            schema_name
        );
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut connection)
            .await?;
        info!("rows: {}", rows.len());
        if rows.is_empty() {
            return Ok(vec![]);
        }
        let mut vec = vec![];
        for item in rows.iter() {
            let table_name: String = item.try_get(0)?;
            let sql = format!(
                "select count(*) from {}.{}",
                schema_name.clone(),
                table_name.clone()
            );
            info!("sql: {}", sql);
            let record_count: i64 = sqlx::query(sqlx::AssertSqlSafe(sql))
                .fetch_one(&mut connection)
                .await?
                .try_get(0)?;
            let description = crate::driver::node::count_description(record_count);
            vec.push(expandable_node("singleTable", table_name, description));
        }
        Ok(vec)
    }

    async fn list_table_child_nodes(
        &self,
        list_node_info_req: &ListNodeInfoReq,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let level_infos = &list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let node_name = level_infos[5].config_value.clone();

        if node_name == "Columns" {
            return self.list_column_nodes(database_name, table_name).await;
        }
        if node_name == "Index" {
            return self
                .list_index_nodes(database_name, schema_name, table_name)
                .await;
        }
        Ok(vec![])
    }

    async fn list_column_nodes(
        &self,
        database_name: String,
        table_name: String,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("select c.column_name, c.data_type,  t.constraint_type
                from   information_schema.columns c
                left join information_schema.key_column_usage s on s.table_name = c.table_name and s.column_name = c.column_name
                left join information_schema.table_constraints t on t.table_name = c.table_name and t.constraint_name = s.constraint_name
                where  c.table_name ='{}' ", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
        let mut vec = vec![];
        for item in rows {
            let column_name: String = item.try_get(0)?;
            let column_type: String = item.try_get(1)?;

            let key_name: Option<String> = item.try_get(2)?;
            if let Some(s) = key_name {
                if s == "PRIMARY KEY" {
                    vec.push(leaf_node("primary", column_name, Some(column_type)));
                }
            } else {
                vec.push(leaf_node("column", column_name, Some(column_type)));
            }
        }
        Ok(vec)
    }

    async fn list_index_nodes(
        &self,
        database_name: String,
        schema_name: String,
        table_name: String,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!(
            "SELECT 
    indexname AS index_name,
    indexdef AS index_definition
FROM 
    pg_indexes
WHERE 
    schemaname = '{}'  
    AND tablename = '{}'; ",
            schema_name.clone(),
            table_name
        );
        info!("sql: {}", sql);
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_all(&mut conn)
            .await?;
        let mut vec = vec![];
        for item in rows {
            let index_name: String = item.try_get(0)?;

            let key_name: String = item.try_get(1)?;
            let icon_name = if key_name == "PRIMARY KEY" {
                "singlePrimaryIndex"
            } else {
                "singleCommonIndex"
            };
            vec.push(leaf_node(icon_name, index_name, None));
        }
        Ok(vec)
    }
}

async fn count_schema_tables(
    conn: &mut PgConnection,
    schema_name: &str,
) -> Result<i64, anyhow::Error> {
    let sql = format!(
        "SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = '{}';",
        schema_name
    );
    let result_row = sqlx::query(sqlx::AssertSqlSafe(sql))
        .fetch_optional(&mut *conn)
        .await?
        .ok_or(anyhow!(""))?;
    let tables_count: i64 = result_row.try_get(0)?;
    Ok(tables_count)
}

fn list_table_category_nodes() -> Vec<ListNodeInfoResponseItem> {
    let mut vec = vec![];
    for (name, icon_name) in get_postgresql_table_data().iter() {
        vec.push(expandable_node(icon_name, name.to_string(), None));
    }
    vec
}
