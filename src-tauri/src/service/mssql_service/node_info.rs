use super::config::MssqlConfig;
use super::queries::get_index_sql;
use super::queries::get_mssql_database_data;
use super::queries::get_mssql_table_data;
use super::queries::get_schema_sql;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_req::ListNodeInfoReqItem;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use anyhow::anyhow;
use futures_util::TryStreamExt;
use human_bytes::human_bytes;
use tiberius::numeric::Numeric;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;

type MssqlConn = Client<Compat<TcpStream>>;

impl MssqlConfig {
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let items = match level_infos.len() {
            1 => Some(self.list_level1_databases().await?),
            2 => Some(self.list_level2_schemas(&level_infos).await?),
            3 => Some(self.list_level3_sections(&level_infos).await?),
            4 => self.list_level4_section_items(&level_infos).await?,
            5 => Some(Self::list_level5_table_sections()),
            6 => self.list_level6_table_items(&level_infos).await?,
            _ => {
                info!("list_node_info_req: {:?}", level_infos);
                None
            }
        };
        Ok(match items {
            Some(list) => ListNodeInfoResponse::new(list),
            None => ListNodeInfoResponse::new_with_empty(),
        })
    }

    async fn list_level1_databases(&self) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let mut conn = self.get_connection().await?;

        let stream = conn
            .query(
                "  SELECT 
            DB_NAME(mf.database_id) AS database_name,
            CAST(SUM(mf.size * 8.0 / 1024.0) AS DECIMAL(10, 2)) AS database_size_mb
        FROM 
            sys.master_files mf
        GROUP BY 
            mf.database_id",
                &[],
            )
            .await?;
        let mut row_stream = stream.into_row_stream();

        let mut vec = vec![];
        while let Some(row) = row_stream.try_next().await? {
            let db_name: Option<&str> = row.try_get(0).map_err(|e| anyhow!(e))?;
            let db_size_mb: Option<String> = row
                .try_get(1)
                .map_err(|e| anyhow!(e))?
                .map(|item: Numeric| human_bytes(f64::from(item)));

            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                "database".to_string(),
                db_name.ok_or(anyhow!(""))?.to_string(),
                db_size_mb,
            );
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn list_level2_schemas(
        &self,
        level_infos: &[ListNodeInfoReqItem],
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let mut conn = self.get_connection().await?;
        let db_name = level_infos[1].config_value.clone();
        let sql = get_schema_sql(db_name);
        let stream = conn.query(&sql, &[]).await?;
        let mut row_stream = stream.into_row_stream();

        let mut vec = vec![];
        while let Some(row) = row_stream.try_next().await? {
            let schema_name = row
                .try_get(0)
                .map_err(|e| anyhow!(e))?
                .map(|schema: &str| schema.to_string())
                .ok_or(anyhow!(""))?;

            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                "schema".to_string(),
                schema_name.clone(),
                None,
            );
            // info!("schema name is:{}", schema_name);
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn list_level3_sections(
        &self,
        level_infos: &[ListNodeInfoReqItem],
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let db_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();

        let mut conn = self.get_connection_with_database(db_name).await?;
        let sql = format!(
            "SELECT count(*)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{}'
      AND TABLE_TYPE = 'BASE TABLE';",
            schema_name
        );
        let tables_count: i32 = conn
            .query(&sql, &[])
            .await?
            .into_row()
            .await?
            .ok_or(anyhow!(""))?
            .try_get(0)?
            .ok_or(anyhow!(""))?;
        let mut vec = vec![];
        for (name, icon_name) in get_mssql_database_data().iter() {
            let description = if *name == "Tables" && tables_count > 0 {
                Some(format!("({})", tables_count))
            } else {
                None
            };
            info!("description: {}", tables_count);
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                icon_name.to_string(),
                name.to_string(),
                description,
            );
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn list_level4_section_items(
        &self,
        level_infos: &[ListNodeInfoReqItem],
    ) -> Result<Option<Vec<ListNodeInfoResponseItem>>, anyhow::Error> {
        let db_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let node_name = level_infos[3].config_value.clone();
        let mut conn = self.get_connection_with_database(db_name.clone()).await?;

        if node_name == "Tables" {
            let items = Self::fetch_level4_table_items(&mut conn, schema_name.as_str()).await?;
            return Ok(Some(items));
        } else if node_name == "Views" {
            let items = Self::fetch_level4_view_items(&mut conn, schema_name.as_str()).await?;
            info!("list_node_info: {:?}", items);
            return Ok(Some(items));
        } else if node_name == "Functions" {
            let items = Self::fetch_level4_function_items(&mut conn, schema_name.as_str()).await?;
            info!("list_node_info: {:?}", items);
            return Ok(Some(items));
        } else if node_name == "Procedures" {
            let items = Self::fetch_level4_procedure_items(&mut conn, schema_name.as_str()).await?;
            info!("list_node_info: {:?}", items);
            return Ok(Some(items));
        }
        Ok(None)
    }

    fn list_level5_table_sections() -> Vec<ListNodeInfoResponseItem> {
        let mut vec = vec![];
        for (name, icon_name) in get_mssql_table_data().iter() {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                icon_name.to_string(),
                name.to_string(),
                None,
            );
            vec.push(list_node_info_response_item);
        }
        vec
    }

    async fn list_level6_table_items(
        &self,
        level_infos: &[ListNodeInfoReqItem],
    ) -> Result<Option<Vec<ListNodeInfoResponseItem>>, anyhow::Error> {
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let node_name = level_infos[5].config_value.clone();
        if node_name == "Columns" {
            let items = self
                .fetch_level6_column_items(database_name, table_name)
                .await?;
            return Ok(Some(items));
        } else if node_name == "Index" {
            let items = self
                .fetch_level6_index_items(database_name, schema_name, table_name)
                .await?;
            return Ok(Some(items));
        }
        Ok(None)
    }

    async fn fetch_level4_table_items(
        conn: &mut MssqlConn,
        schema_name: &str,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let sql = format!(
            "SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{}'
      AND TABLE_TYPE = 'BASE TABLE';",
            schema_name
        );
        let stream = conn.query(&sql, &[]).await?;
        let mut row_stream = stream.into_row_stream();

        let mut vec = vec![];
        while let Some(row) = row_stream.try_next().await? {
            let schema_name = row
                .try_get(0)
                .map_err(|e| anyhow!(e))?
                .map(|schema: &str| schema.to_string())
                .ok_or(anyhow!(""))?;

            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                "singleTable".to_string(),
                schema_name.clone(),
                None,
            );
            // info!("schema name is:{}", schema_name);
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn fetch_level4_view_items(
        conn: &mut MssqlConn,
        schema_name: &str,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let sql = format!(
            "SELECT TABLE_NAME AS ViewName
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = '{}';",
            schema_name
        );
        let rows = conn.query(&sql, &[]).await?.into_first_result().await?;

        let mut vec = vec![];
        for item in rows {
            let table_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
            let sql = format!("select count(*) from {}.{}", schema_name, table_name);
            info!("sql: {}", sql);
            let row = conn
                .query(&sql, &[])
                .await?
                .into_row()
                .await?
                .ok_or(anyhow!(""))?;
            let record_count: i32 = row.try_get(0)?.ok_or(anyhow!(""))?;
            let description = if record_count > 0 {
                Some(format!("{}", record_count))
            } else {
                None
            };
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                "singleTable".to_string(),
                table_name.to_string(),
                description,
            );
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn fetch_level4_function_items(
        conn: &mut MssqlConn,
        schema_name: &str,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let list_functions_sql = format!(
            "SELECT 
    o.name AS ROUTINE_NAME,
    CASE 
        WHEN o.type = 'FN' THEN 'FUNCTION'
        WHEN o.type = 'IF' THEN 'FUNCTION' 
        WHEN o.type = 'TF' THEN 'FUNCTION'
        ELSE 'UNKNOWN'
    END AS ROUTINE_TYPE,
    sm.definition AS DATA_TYPE,
    o.create_date AS CREATED,
    o.modify_date AS LAST_ALTERED
FROM 
    sys.objects o
JOIN 
    sys.sql_modules sm ON o.object_id = sm.object_id
WHERE 
    o.type IN ('FN', 'IF', 'TF')  -- 'FN' = Scalar Function, 'IF' = Inline Table-Valued Function, 'TF' = Table-Valued Function
    AND SCHEMA_NAME(o.schema_id) = '{}';
",
            schema_name
        );
        let rows = conn
            .query(&list_functions_sql, &[])
            .await?
            .into_first_result()
            .await?;
        let mut vec = vec![];
        for item in rows {
            let function_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;

            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                false,
                true,
                "singleFunction".to_string(),
                function_name.to_string(),
                None,
            );
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn fetch_level4_procedure_items(
        conn: &mut MssqlConn,
        schema_name: &str,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let list_functions_sql = format!(
            "SELECT name AS ProcedureName
FROM sys.procedures
WHERE SCHEMA_NAME(schema_id) = '{}'
ORDER BY name;",
            schema_name
        );
        let rows = conn
            .query(&list_functions_sql, &[])
            .await?
            .into_first_result()
            .await?;
        let mut vec = vec![];
        for item in rows {
            let function_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;

            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                false,
                true,
                "singleProcedure".to_string(),
                function_name.to_string(),
                None,
            );
            vec.push(list_node_info_response_item);
        }
        Ok(vec)
    }

    async fn fetch_level6_column_items(
        &self,
        database_name: String,
        table_name: String,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let show_column_sql = format!(
            "SELECT 
    c.name AS ColumnName, 
    t.name AS DataType, 
    c.max_length AS MaxLength, 
    c.is_nullable AS IsNullable, 
    c.is_identity AS IsIdentity
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('{}');",
            table_name
        );
        let mut conn = self.get_connection_with_database(database_name).await?;
        let vecs = conn
            .query(&show_column_sql, &[])
            .await?
            .into_first_result()
            .await?;
        let mut vec = vec![];
        for row in vecs {
            let column_name: &str = row.try_get(0)?.ok_or(anyhow!(""))?;
            let column_type: &str = row.try_get(1)?.ok_or(anyhow!(""))?;

            let key_type: bool = row.try_get(4)?.ok_or(anyhow!(""))?;
            if key_type {
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    false,
                    true,
                    "primary".to_string(),
                    column_name.to_string(),
                    Some(column_type.to_string()),
                );
                vec.push(list_node_info_response_item);
            } else {
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    false,
                    true,
                    "column".to_string(),
                    column_name.to_string(),
                    Some(column_type.to_string()),
                );
                vec.push(list_node_info_response_item);
            }
        }
        Ok(vec)
    }

    async fn fetch_level6_index_items(
        &self,
        database_name: String,
        schema_name: String,
        table_name: String,
    ) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
        let sql = get_index_sql(schema_name, table_name);
        let mut conn = self.get_connection_with_database(database_name).await?;
        let vecs = conn.query(&sql, &[]).await?.into_first_result().await?;
        let mut vec = vec![];
        for row in vecs {
            let index_name: &str = row.try_get(0)?.ok_or(anyhow!(""))?;

            let key_type: bool = row.try_get(5)?.ok_or(anyhow!(""))?;
            if key_type {
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    false,
                    true,
                    "singlePrimaryIndex".to_string(),
                    index_name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            } else {
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    false,
                    true,
                    "singleCommonIndex".to_string(),
                    index_name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            }
        }
        Ok(vec)
    }
}
