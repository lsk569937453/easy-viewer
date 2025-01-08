use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct GetObjectInfoRes {
    pub name: String,
    pub size: String,
    pub last_modified: String,
    pub etag: String,
    pub content_type: String,
}
impl GetObjectInfoRes {
    pub fn new(
        name: String,
        size: String,
        last_modified: String,
        etag: String,
        content_type: String,
    ) -> GetObjectInfoRes {
        GetObjectInfoRes {
            name,
            size,
            last_modified,
            etag,
            content_type,
        }
    }
}
