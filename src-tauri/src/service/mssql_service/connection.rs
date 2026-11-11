use super::config::MssqlConfig;
use anyhow::anyhow;
use std::time::Duration;
use tiberius::AuthMethod;
use tiberius::Client;
use tiberius::Config;
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_util::compat::Compat;
use tokio_util::compat::TokioAsyncWriteCompatExt;

impl MssqlConfig {
    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let mut conn = self.get_connection().await?;
        let row = conn
            .query("SELECT @@VERSION", &[])
            .await?
            .into_row()
            .await?
            .ok_or(anyhow!("No result"))?;
        let version: &str = row.try_get(0)?.ok_or(anyhow!("No version"))?;
        let version = version.lines().next().unwrap_or(version).to_string();
        Ok(version)
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        info!("test_connection{:?}", self.config);
        self.get_connection().await?;
        Ok(())
    }
    pub(super) async fn get_connection(&self) -> Result<Client<Compat<TcpStream>>, anyhow::Error> {
        let mut config = Config::new();

        config.host(&self.config.host);
        config.port(self.config.port as u16);
        config.authentication(AuthMethod::sql_server(
            &self.config.user_name,
            &self.config.password,
        ));
        config.trust_cert();

        let tcp = timeout(
            Duration::from_millis(500),
            TcpStream::connect(config.get_addr()),
        )
        .await
        .map_err(|_e| anyhow!("Connect timeout in 500ms."))??;
        tcp.set_nodelay(true)?;

        let client = timeout(
            Duration::from_millis(500),
            Client::connect(config, tcp.compat_write()),
        )
        .await??;
        Ok(client)
    }
    pub(super) async fn get_connection_with_database(
        &self,
        db_name: String,
    ) -> Result<Client<Compat<TcpStream>>, anyhow::Error> {
        let mut config = Config::new();

        config.host(&self.config.host);
        config.port(self.config.port as u16);
        config.database(db_name);
        config.authentication(AuthMethod::sql_server(
            &self.config.user_name,
            &self.config.password,
        ));
        config.trust_cert();

        let tcp = timeout(
            Duration::from_millis(500),
            TcpStream::connect(config.get_addr()),
        )
        .await??;
        tcp.set_nodelay(true)?;

        let client = timeout(
            Duration::from_millis(500),
            Client::connect(config, tcp.compat_write()),
        )
        .await??;
        Ok(client)
    }
}
