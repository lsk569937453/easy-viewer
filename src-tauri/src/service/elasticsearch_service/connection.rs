use crate::service::elasticsearch_service::config::ElasticsearchConfig;
use elasticsearch::auth::Credentials;
use elasticsearch::http::transport::SingleNodeConnectionPool;
use elasticsearch::http::transport::TransportBuilder;
use elasticsearch::Elasticsearch;
use std::time::Duration;
use tokio::time::timeout;
use url::Url;

impl ElasticsearchConfig {
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }

    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let client = self.get_connection()?;
        let response = timeout(Duration::from_secs(1), client.info().send())
            .await
            .map_err(|_| anyhow!("Connect timeout"))??;
        let status = response.status_code();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!(
                "Elasticsearch info request failed with status {}: {}",
                status,
                error_text
            ));
        }
        let body: serde_json::Value = response.json().await?;
        let version = body
            .get("version")
            .and_then(|v| v.get("number"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("version.number not found in Elasticsearch response"))?;
        Ok(version.to_string())
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let client = self.get_connection()?;
        let response = timeout(Duration::from_secs(1), client.ping().send())
            .await
            .map_err(|_| anyhow!("Connect timeout"))??;
        let status = response.status_code();
        if !status.is_success() {
            return Err(anyhow!("Elasticsearch ping failed with status: {}", status));
        }
        Ok(())
    }

    pub(super) fn get_connection(&self) -> Result<Elasticsearch, anyhow::Error> {
        let protocol = if self.config.port == 443 {
            "https"
        } else {
            "http"
        };
        let url_str = format!("{}://{}:{}", protocol, self.config.host, self.config.port);
        let url = Url::parse(&url_str)?;

        let conn_pool = SingleNodeConnectionPool::new(url);
        let mut builder = TransportBuilder::new(conn_pool);

        if !self.config.user_name.is_empty() {
            let credentials =
                Credentials::Basic(self.config.user_name.clone(), self.config.password.clone());
            builder = builder.auth(credentials);
        }

        let transport = builder.build()?;
        Ok(Elasticsearch::new(transport))
    }
}
