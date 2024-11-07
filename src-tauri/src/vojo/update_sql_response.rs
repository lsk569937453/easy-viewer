use serde::{Deserialize, Serialize};


#[derive(Deserialize, Serialize)]
pub struct UpdateSqlResponse {
    pub response_list: Vec<UpdateSqlResponseItem>,
}
impl UpdateSqlResponse {
    pub fn new(response_list: Vec<UpdateSqlResponseItem>) -> UpdateSqlResponse {
        UpdateSqlResponse { response_list }
    }
}
#[derive(Deserialize, Serialize)]
pub struct UpdateSqlResponseItem {
    pub response_code: i32,
    pub response_msg: String,
}
impl UpdateSqlResponseItem {
    pub fn new() -> UpdateSqlResponseItem {
        UpdateSqlResponseItem {
            response_code: 0,
            response_msg: "".to_string(),
        }
    }
    pub fn new_with_error(error: anyhow::Error) -> UpdateSqlResponseItem {
        UpdateSqlResponseItem {
            response_code: -1,
            response_msg: error.to_string(),
        }
    }
}
