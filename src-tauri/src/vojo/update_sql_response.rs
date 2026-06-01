use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[allow(dead_code)]
pub struct UpdateSqlResponse {
    pub response_list: Vec<UpdateSqlResponseItem>,
}
impl UpdateSqlResponse {}
#[derive(Deserialize, Serialize)]
#[allow(dead_code)]
pub struct UpdateSqlResponseItem {
    pub response_code: i32,
    pub response_msg: String,
}
impl UpdateSqlResponseItem {}
