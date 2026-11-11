use crate::service::base_config_service::DatabaseHostStruct;
use serde::Deserialize;
use serde::Serialize;

#[derive(Deserialize, Serialize, Clone)]
pub struct ElasticsearchConfig {
    pub config: DatabaseHostStruct,
}
