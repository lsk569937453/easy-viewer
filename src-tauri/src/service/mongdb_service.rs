use crate::service::base_config_service::DatabaseHostStruct;
use mongodb::options::ClientOptions;
use mongodb::Client;
use serde::Deserialize;
use serde::Serialize;
#[derive(Deserialize, Serialize, Clone)]
pub struct MongodbConfig {
    pub config: DatabaseHostStruct,
}
impl MongodbConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mongodb".to_string());
        let client_options = ClientOptions::parse(&test_url).await?;
        let client = Client::with_options(client_options)?;
        client.list_databases().await?;
        Ok(())
    }
}
