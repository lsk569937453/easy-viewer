use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct GetBaseConnectionResponse {
    pub base_config_list: Vec<GetBaseConnectionResponseItem>,
}
#[derive(Deserialize, Serialize)]
pub struct GetBaseConnectionResponseItem {
    pub base_config_id: i32,
    pub connection_name: String,
    pub connection_type: i32,
}
#[derive(Deserialize, Serialize)]
pub struct GetBaseConnectionByIdResponse {
    pub base_config_id: i32,
    pub connection_name: String,
    pub connection_json: String,
    pub connection_type: i32,
}
