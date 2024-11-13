use serde::{Deserialize, Serialize};
#[derive(Debug, Deserialize, Serialize)]

pub struct ListNodeInfoResponse {
    pub list: Vec<ListNodeInfoResponseItem>,
}
impl ListNodeInfoResponse {
    pub fn new(list: Vec<ListNodeInfoResponseItem>) -> Self {
        ListNodeInfoResponse { list }
    }
    pub fn new_with_empty() -> Self {
        ListNodeInfoResponse { list: vec![] }
    }
}
#[derive(Debug, Deserialize, Serialize)]
pub struct ListNodeInfoResponseItem {
    pub id: String,
    pub show_first_icon: bool,
    pub show_second_icon: bool,
    pub icon_name: String,
    pub name: String,
    pub description: Option<String>,
}
impl ListNodeInfoResponseItem {
    pub fn new(
        show_first_icon: bool,
        show_second_icon: bool,
        icon_name: String,
        name: String,
        description: Option<String>,
    ) -> Self {
        let uuid = uuid::Uuid::new_v4().to_string();
        ListNodeInfoResponseItem {
            id: uuid,
            show_first_icon,
            show_second_icon,
            icon_name,
            name,
            description,
        }
    }
}
