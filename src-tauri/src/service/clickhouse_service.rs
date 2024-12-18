use crate::service::base_config_service::DatabaseHostStruct;
use serde::Deserialize;
use serde::Serialize;
#[derive(Deserialize, Serialize, Clone)]
pub struct ClickhouseConfig {
    pub config: DatabaseHostStruct,
}

impl ClickhouseConfig {}
