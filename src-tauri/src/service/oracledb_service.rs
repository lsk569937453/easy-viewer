use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use oracle::Connection;
use serde::Deserialize;
use serde::Serialize;
#[derive(Deserialize, Serialize, Clone)]
pub struct OracledbConfig {
    pub config: DatabaseHostStruct,
}
impl OracledbConfig {
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }
    pub fn test_connection(&self) -> Result<(), anyhow::Error> {
        self.get_connection()?;
        Ok(())
    }
    fn get_connection(&self) -> Result<Connection, anyhow::Error> {
        let connect_string = if let Some(db) = &self.config.database {
            format!("{}:{}/{}", self.config.host, self.config.port, db)
        } else {
            format!("{}:{}", self.config.host, self.config.port)
        };
        info!("connect_string: {}", connect_string);
        Connection::connect(
            self.config.user_name.clone(),
            self.config.password.clone(),
            connect_string,
        )
        .map_err(|e| anyhow!(e))
    }
    pub async fn list_node_info(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];
        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let connection = self.get_connection().map_err(|e| anyhow!(e))?;
                let rows = connection.query("SELECT USER FROM dual", &[])?;
                for item in rows {
                    let username: String = item?.get(0)?;
                    info!("username: {}", username);

                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "database".to_string(),
                        username.to_string(),
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {}", level_infos.len());
            }
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }
}
