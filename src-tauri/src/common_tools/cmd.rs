use crate::common_tools::about::get_about_version_with_error;

use crate::common_tools::base_response::BaseResponse;

use crate::common_tools::database::list_database_with_error;
use crate::common_tools::database::test_url_with_error;
use crate::common_tools::database::TestDatabaseRequest;
use crate::common_tools::sql_lite::get_base_config_with_error;
use crate::common_tools::sql_lite::save_base_config_with_error;
use crate::sql_lite::connection::AppState;
use crate::vojo::base_config::BaseConfig;
use crate::vojo::static_connections::Connections;
use tauri::State;

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
    state: State<'_, AppState>,
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
pub async fn get_base_config(state: State<'_, AppState>) -> Result<String, ()> {
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
#[tauri::command]
pub async fn list_database(
    state: State<'_, AppState>,
    state2: State<'_, Connections>,
    id: i32,
) -> Result<String, ()> {
    let res = match list_database_with_error(state, state2, id).await {
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
