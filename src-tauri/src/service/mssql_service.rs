use crate::service::base_config_service::DatabaseHostStruct;
use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;
use tiberius::AuthMethod;
use tiberius::Client;
use tiberius::Config;
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_util::compat::Compat;
use tokio_util::compat::TokioAsyncWriteCompatExt;
#[derive(Deserialize, Serialize, Clone)]
pub struct MssqlConfig {
    pub config: DatabaseHostStruct,
}
impl MssqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        info!("test_connection{:?}", self.config);
        self.get_connection().await?;
        Ok(())
    }
    async fn get_connection(&self) -> Result<Client<Compat<TcpStream>>, anyhow::Error> {
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
