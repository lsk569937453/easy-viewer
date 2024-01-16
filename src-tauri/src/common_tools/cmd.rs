use crate::common_tools::about::get_about_version_with_error;
use crate::common_tools::base64::base64_decode_with_error;
use crate::common_tools::base64::base64_encode_of_image_with_error;
use crate::common_tools::base64::base64_encode_with_error;
use crate::common_tools::base64::base64_save_image_with_error;
use crate::common_tools::base_response::BaseResponse;

use crate::common_tools::database::test_url_with_error;
use crate::common_tools::database::TestDatabaseRequest;
use crate::common_tools::sql_lite::get_base_config_with_error;
use crate::common_tools::sql_lite::reset_menu_index_with_error;
use crate::common_tools::sql_lite::save_base_config_with_error;
use crate::sql_lite::connection::SqlitePoolWrapper;
use crate::vojo::base_config::BaseConfig;
use tauri::State;
#[tauri::command]
pub fn base64_encode(source_string: String) -> String {
    match base64_encode_with_error(source_string) {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}
#[tauri::command]
pub async fn test_url(test_database_request: TestDatabaseRequest) -> String {
    match test_url_with_error(test_database_request).await {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}
#[tauri::command]
pub fn base64_decode(source_string: String) -> String {
    match base64_decode_with_error(source_string) {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}

#[tauri::command]
pub fn base64_encode_of_image(source_string: String) -> String {
    match base64_encode_of_image_with_error(source_string) {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}
#[tauri::command]
pub fn base64_save_image(source_string: String) -> String {
    match base64_save_image_with_error(source_string) {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}

#[tauri::command]
pub fn get_about_version() -> String {
    match get_about_version_with_error() {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}

#[tauri::command]
pub async fn save_base_config(
    state: State<'_, SqlitePoolWrapper>,
    base_config: BaseConfig,
) -> Result<String, ()> {
    let res = match save_base_config_with_error(state, base_config).await {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    };
    Ok(res)
}
#[tauri::command]
pub async fn get_base_config(state: State<'_, SqlitePoolWrapper>) -> Result<String, ()> {
    let res = match get_base_config_with_error(state).await {
        Ok(item) => {
            let res = BaseResponse {
                response_code: 0,
                response_msg: item,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = BaseResponse {
                response_code: 1,
                response_msg: e.to_string(),
            };
            serde_json::to_string(&res).unwrap()
        }
    };
    Ok(res)
}
