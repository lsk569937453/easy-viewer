use serde::{Deserialize, Serialize};


#[derive(Deserialize, Serialize)]
pub struct ListNodeInfoReq {
    pub level_infos: Vec<ListNodeInfoReqItem>,
}
#[derive(Deserialize, Serialize)]
pub struct ListNodeInfoReqItem {
    pub level: i32,
    pub config_value: String,
}
