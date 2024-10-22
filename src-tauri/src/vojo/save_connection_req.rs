use serde::{Deserialize, Serialize};

use super::base_config::BaseConfig;

#[derive(Deserialize, Serialize)]
pub struct SaveConnectionRequest {
    pub base_config: BaseConfig,
    pub connection_name: String,
}
