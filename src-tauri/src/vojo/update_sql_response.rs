use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct UpdateSqlResponse {
    pub response_list: Vec<UpdateSqlResponseItem>,
}
impl UpdateSqlResponse {}
#[derive(Deserialize, Serialize)]
pub struct UpdateSqlResponseItem {
    pub response_code: i32,
    pub response_msg: String,
}
impl UpdateSqlResponseItem {}
