use serde::{Deserialize, Serialize};

use std::fmt::Debug;
#[derive(Deserialize, Serialize, Debug)]
pub struct ImportDatabaseReq {
    pub file_path: String,
}
