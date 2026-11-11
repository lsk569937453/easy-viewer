use super::config::MysqlConfig;
use anyhow::Ok;
use sqlx::Connection;
use sqlx::MySqlConnection;
use sqlx::Row;
use std::time::Duration;
use tokio::time::timeout;

impl MysqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mysql".to_string());
        timeout(Duration::from_secs(1), MySqlConnection::connect(&test_url))
            .await
            .map_err(|_| anyhow!("Connect timeout"))?
            .map_err(|e| anyhow!(e))?;
        Ok(())
    }

    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }

    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let mut conn = timeout(
            Duration::from_secs(1),
            MySqlConnection::connect(&connection_url),
        )
        .await
        .map_err(|_| anyhow!("Connect timeout"))??;
        let row = sqlx::query("SELECT VERSION()").fetch_one(&mut conn).await?;
        let version: String = row.try_get(0)?;
        Ok(version)
    }
}
