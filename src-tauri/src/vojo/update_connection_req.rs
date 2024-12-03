use serde::{Deserialize, Serialize};

use crate::service::base_config_service::BaseConfig;

#[derive(Deserialize, Serialize)]
pub struct UpdateConnectionRequest {
    pub base_config: BaseConfig,
    pub connection_name: String,
    pub connection_id: i32,
}
