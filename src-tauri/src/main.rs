// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::time::Duration;
use zookeeper::recipes::cache::PathChildrenCache;
use zookeeper::{Acl, CreateMode, WatchedEvent, Watcher, ZooKeeper};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
struct LoggingWatcher;
impl Watcher for LoggingWatcher {
    fn handle(&self, e: WatchedEvent) {
        println!("{:?}", e)
    }
}
fn main() {
    zookeeper();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
fn zookeeper() {
    let zk_url = "localhost:2181";
    let zk = ZooKeeper::connect(zk_url, Duration::from_secs(15), LoggingWatcher).unwrap();

    zk.add_listener(|zk_state| println!("New ZkState is {:?}", zk_state));

    let mut tmp = String::new();

    let auth = zk.add_auth("digest", vec![1, 2, 3, 4]);

    println!("authenticated -> {:?}", auth);

    let path = zk.create(
        "/test",
        vec![1, 2],
        Acl::open_unsafe().clone(),
        CreateMode::Ephemeral,
    );

    println!("created -> {:?}", path);

    let exists = zk.exists("/test", true);

    println!("exists -> {:?}", exists);

    let doesnt_exist = zk.exists("/blabla", true);

    println!("don't exists path -> {:?}", doesnt_exist);

    let get_acl = zk.get_acl("/test");

    println!("get_acl -> {:?}", get_acl);

    let set_acl = zk.set_acl("/test", Acl::open_unsafe().clone(), None);

    println!("set_acl -> {:?}", set_acl);

    let children = zk.get_children("/", true);

    println!("children of / -> {:?}", children);

    let set_data = zk.set_data("/test", vec![6, 5, 4, 3], None);

    println!("set_data -> {:?}", set_data);

    let get_data = zk.get_data("/test", true);

    println!("get_data -> {:?}", get_data);
}
