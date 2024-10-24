use serde::{Deserialize, Serialize};

use std::fmt::Debug;
#[derive(Deserialize, Serialize, Debug)]
pub struct ListNodeInfoReq {
    pub level_infos: Vec<ListNodeInfoReqItem>,
}
#[derive(Deserialize, Serialize, Debug)]
pub struct ListNodeInfoReqItem {
    pub level: i32,
    pub config_value: String,
}
