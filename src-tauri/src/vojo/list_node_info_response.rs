pub struct ListNodeInfoResponse {
    pub list: Vec<ListNodeInfoResponseItem>,
}
pub struct ListNodeInfoResponseItem {
    pub id: String,
    pub show_first_icon: bool,
    pub show_second_icon: bool,
    pub icon_name: String,
    pub name: String,
    pub description: Option<String>,
}
