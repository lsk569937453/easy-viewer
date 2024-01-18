use std::any::Any;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct Connections {
    pub map: Arc<Mutex<HashMap<i32, Box<dyn Any + Send>>>>,
}
