use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use human_bytes::human_bytes;
use std::sync::OnceLock;

use linked_hash_map::LinkedHashMap;
use mongodb::options::ClientOptions;
use mongodb::Client;
use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;
use tokio::time::timeout;
static MONGODB_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_mysql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MONGODB_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MongodbConfig {
    pub config: DatabaseHostStruct,
}
impl MongodbConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mongodb".to_string());
        let client_options = ClientOptions::parse(&test_url).await?;
        let client = Client::with_options(client_options)?;
        timeout(Duration::from_millis(500), client.list_databases())
            .await
            .map_err(|_| anyhow!("Connect timeout"))?
            .map_err(|e| anyhow!("Connect error:{:?}", e))?;
        Ok(())
    }
    async fn get_connection(&self) -> Result<Client, anyhow::Error> {
        let mongodb_url = self.config.to_url("mongodb".to_string());
        info!("mongodb_url: {}", mongodb_url);
        let client_options = ClientOptions::parse(&mongodb_url).await?;
        let client = Client::with_options(client_options)?;
        Ok(client)
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
                let client = self.get_connection().await?;
                let database_names = client.list_databases().await.map_err(|e| anyhow!(e))?;
                for database_specification in database_names {
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "database".to_string(),
                        database_specification.name,
                        Some(human_bytes(database_specification.size_on_disk as f64)),
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {:?}", level_infos);
            }
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }
}
