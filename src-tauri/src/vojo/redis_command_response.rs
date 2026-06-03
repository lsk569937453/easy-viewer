use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RedisCommandResponse {
    pub response_type: String,   // "string" | "integer" | "array" | "nil" | "status" | "ok"
    pub value: Option<String>,   // 简单类型的值
    pub array_items: Option<Vec<String>>,  // 数组类型的每个元素（字符串化）
    pub execution_time_ms: u64,
}
