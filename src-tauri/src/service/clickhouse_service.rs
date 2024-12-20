use crate::service::base_config_service::DatabaseHostStruct;
use clickhouse::Client;
use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;
use tokio::time::timeout;
#[derive(Deserialize, Serialize, Clone)]
pub struct ClickhouseConfig {
    pub config: DatabaseHostStruct,
}

impl ClickhouseConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let _ = self.get_connection().await?;

        Ok(())
    }
    async fn get_connection(&self) -> Result<Client, anyhow::Error> {
        let url = format!("http://{}:{}", self.config.host, self.config.port);
        let client = Client::default()
            .with_url(url.clone())
            .with_user(self.config.user_name.clone())
            .with_password(self.config.password.clone());
        info!("Clickhouse url: {}", url);
        let t = timeout(
            Duration::from_millis(500),
            client.query("SELECT 'Hello, World!'").fetch_one::<usize>(),
        )
        .await??;
        info!("Clickhouse url2: {}", t);

        Ok(client)
    }
}
