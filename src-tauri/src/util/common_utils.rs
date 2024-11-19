use serde_json::Value;

pub fn serde_value_to_string(value: Value) -> Option<String> {
    if value.is_string() {
        Some(value.as_str().unwrap_or_default().to_string())
    } else if value.is_null() {
        None
    } else {
        Some(value.to_string())
    }
}
