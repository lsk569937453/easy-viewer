use super::config::PostgresqlConfig;
use anyhow::anyhow;
use sqlx::Connection;
use sqlx::PgConnection;
use sqlx::Row;
use std::time::Duration;
use tokio::time::timeout;

impl PostgresqlConfig {
    fn connection_url(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}",
            self.config.user_name, self.config.password, self.config.host, self.config.port,
        )
    }
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }
    pub(super) fn connection_url_with_database(&self, database: String) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.config.user_name,
            self.config.password,
            self.config.host,
            self.config.port,
            database
        )
    }
    pub(super) async fn get_connection(&self) -> Result<PgConnection, anyhow::Error> {
        let connection_url = self.connection_url();
        let conn = timeout(
            Duration::from_millis(500),
            PgConnection::connect(&connection_url),
        )
        .await
        .map_err(|_| anyhow!("Connect timeout"))??;

        Ok(conn)
    }
    pub(super) async fn get_connection_with_database(
        &self,
        database_name: String,
    ) -> Result<PgConnection, anyhow::Error> {
        let connection_url = self.connection_url_with_database(database_name);

        let conn = timeout(
            Duration::from_millis(500),
            PgConnection::connect(&connection_url),
        )
        .await??;
        Ok(conn)
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("postgres".to_string());
        timeout(Duration::from_secs(1), PgConnection::connect(&test_url))
            .await
            .map_err(|_| anyhow!("Connect timeout"))?
            .map_err(|e| anyhow!(e))?;
        Ok(())
    }
    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let mut conn = self.get_connection().await?;
        let row = sqlx::query("SELECT version()").fetch_one(&mut conn).await?;
        let version: String = row.try_get(0)?;
        Ok(version)
    }
}
