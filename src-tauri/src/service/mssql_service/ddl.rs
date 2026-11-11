use super::config::MssqlConfig;
use super::queries::get_ddl_sql;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::AppState;
use anyhow::anyhow;

impl MssqlConfig {
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

        let sql = get_ddl_sql(schema_name, table_name);
        let row = conn
            .query(&sql, &[])
            .await?
            .into_row()
            .await?
            .ok_or(anyhow!(""))?;
        let ddl: &str = row.try_get(0)?.ok_or(anyhow!(""))?;
        Ok(ddl.to_string())
    }
    pub async fn get_procedure_details(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let procedure_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("EXEC sp_helptext '{}.{}';", schema_name, procedure_name);

        let res_row = conn.query(&sql, &[]).await?.into_first_result().await?;
        let mut vecs = vec![];
        for item in res_row.iter() {
            let query: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
            vecs.push(query);
        }

        Ok(vecs.join(""))
    }
}
