use serde_json::Value;
const MAX_LINE_LENGTH: usize = 50;
pub fn serde_value_to_string(value: Value) -> Option<String> {
    if value.is_string() {
        Some(value.as_str().unwrap_or_default().to_string())
    } else if value.is_null() {
        None
    } else {
        Some(value.to_string())
    }
}
pub fn wrap_string(input: &str, max_line_length: usize) -> String {
    input
        .chars()
        .collect::<Vec<_>>()
        .chunks(max_line_length)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("\n")
}
