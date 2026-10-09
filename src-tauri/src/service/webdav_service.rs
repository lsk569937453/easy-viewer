use crate::vojo::get_object_info_res::GetObjectInfoRes;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use futures_util::TryStreamExt;
use human_bytes::human_bytes;
use percent_encoding::percent_decode_str;
use percent_encoding::utf8_percent_encode;
use percent_encoding::AsciiSet;
use percent_encoding::NON_ALPHANUMERIC;
use reqwest_dav::Auth;
use reqwest_dav::Client as DavClient;
use reqwest_dav::ClientBuilder;
use reqwest_dav::Depth;
use reqwest_dav::types::list_cmd::ListEntity;
use serde::Deserialize;
use serde::Serialize;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;

// Only unreserved characters stay plain in a path segment; everything else
// (spaces, non-ASCII, '/', '#', '?', '%', ...) must be percent-encoded before
// the segment is concatenated into the request URL.
const SEGMENT_ENCODE_SET: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'-')
    .remove(b'.')
    .remove(b'_')
    .remove(b'~');

#[derive(Deserialize, Serialize, Clone)]
pub struct WebdavConfig {
    pub config: WebdavStruct,
}
#[derive(Deserialize, Serialize, Clone)]
pub struct WebdavStruct {
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub root_path: String,
    pub use_tls: bool,
}

fn encode_segment(segment: &str) -> String {
    utf8_percent_encode(segment, SEGMENT_ENCODE_SET).to_string()
}

// "/" for an empty segment list, "/a/b" otherwise
fn encoded_dir(segments: &[String]) -> String {
    if segments.is_empty() {
        "/".to_string()
    } else {
        format!(
            "/{}",
            segments
                .iter()
                .map(|s| encode_segment(s))
                .collect::<Vec<_>>()
                .join("/")
        )
    }
}

// Collection paths keep a trailing slash: some servers 404 on PROPFIND/MKCOL without it
fn collection_path(segments: &[String]) -> String {
    match encoded_dir(segments).as_str() {
        "/" => "/".to_string(),
        p => format!("{}/", p),
    }
}

fn object_path(segments: &[String], is_folder: bool) -> String {
    if is_folder {
        collection_path(segments)
    } else {
        encoded_dir(segments)
    }
}

fn child_path(dir_segments: &[String], name: &str, is_folder: bool) -> String {
    let base = encoded_dir(dir_segments);
    let path = if base == "/" {
        format!("/{}", encode_segment(name))
    } else {
        format!("{}/{}", base, encode_segment(name))
    };
    if is_folder {
        format!("{}/", path)
    } else {
        path
    }
}

// A PROPFIND href can be a server-absolute path ("/dav/docs/") or a full URL
// ("https://host/dav/docs/"); reduce it to the path part.
fn href_to_path(href: &str) -> &str {
    if let Some(pos) = href.find("://") {
        let after = &href[pos + 3..];
        match after.find('/') {
            Some(i) => &after[i..],
            None => "/",
        }
    } else {
        href
    }
}

fn decode_path(path: &str) -> String {
    percent_decode_str(path)
        .decode_utf8()
        .map(|c| c.into_owned())
        .unwrap_or_else(|_| path.to_string())
}

fn name_of(path: &str) -> Option<String> {
    let name = path.trim_end_matches('/').rsplit('/').next()?.trim();
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

// " docs //2024/ " -> ["docs", "2024"]; "" and "/" -> [] (connection root)
fn parse_target_dir(target_dir: &str) -> Vec<String> {
    target_dir
        .split('/')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

struct UploadState {
    file: File,
    total: u64,
    uploaded: u64,
    on_progress: Box<dyn Fn(u64, u64) + Send>,
}

impl WebdavConfig {
    fn scheme_and_host(&self) -> (String, String) {
        let host = self.config.host.trim().to_string();
        if let Some(rest) = host.strip_prefix("https://") {
            ("https".to_string(), rest.to_string())
        } else if let Some(rest) = host.strip_prefix("http://") {
            ("http".to_string(), rest.to_string())
        } else {
            let scheme = if self.config.use_tls { "https" } else { "http" };
            (scheme.to_string(), host)
        }
    }

    // reqwest_dav builds request URLs by string concatenation
    // (host.trim_end_matches('/') + '/' + path), so the root path must live in
    // the host URL itself.
    fn base_url(&self) -> String {
        let (scheme, host) = self.scheme_and_host();
        let root = self.config.root_path.trim_matches('/');
        if root.is_empty() {
            format!("{}://{}:{}", scheme, host, self.config.port)
        } else {
            format!("{}://{}:{}/{}", scheme, host, self.config.port, root)
        }
    }

    // Normalized ("/a/b", no trailing slash) full path of a directory,
    // including the root path prefix, to match against PROPFIND hrefs
    fn self_path(&self, segments: &[String]) -> String {
        let root = decode_path(self.config.root_path.trim_matches('/'));
        let rel = segments.join("/");
        let full = if root.is_empty() {
            rel
        } else if rel.is_empty() {
            root
        } else {
            format!("{}/{}", root, rel)
        };
        format!("/{}", full.trim_matches('/'))
    }

    fn normalize(&self, path: &str) -> String {
        format!("/{}", path.trim_matches('/'))
    }

    async fn get_connection(&self) -> Result<DavClient, anyhow::Error> {
        let agent = reqwest::Client::builder()
            .connect_timeout(std::time::Duration::from_secs(10))
            .build()?;
        let client = ClientBuilder::new()
            .set_agent(agent)
            .set_host(self.base_url())
            .set_auth(Auth::Basic(
                self.config.username.clone(),
                self.config.password.clone(),
            ))
            .build()?;
        Ok(client)
    }

    fn dir_segments(&self, list_node_info_req: &ListNodeInfoReq) -> Vec<String> {
        list_node_info_req
            .level_infos
            .iter()
            .skip(1)
            .map(|item| item.config_value.clone())
            .collect()
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let client = self.get_connection().await?;
        client
            .list("/", Depth::Number(0))
            .await
            .map_err(|e| anyhow!("WebDAV connect failed: {}", e))?;
        Ok(())
    }

    pub async fn get_server_version(&self) -> Result<String, anyhow::Error> {
        let endpoint = format!("{}/", self.base_url().trim_end_matches('/'));
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()?;
        let resp = client.request(reqwest::Method::OPTIONS, &endpoint).send().await;
        match resp {
            Ok(response) => {
                if let Some(server) = response.headers().get("server") {
                    if let Ok(server_str) = server.to_str() {
                        return Ok(server_str.to_string());
                    }
                }
                Ok("WebDAV".to_string())
            }
            Err(_) => Ok("WebDAV".to_string()),
        }
    }

    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        Ok(format!("WebDAV: {}:{}", self.config.host, self.config.port))
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        info!("webdav list_node_info: {:?}", list_node_info_req);
        let segments = self.dir_segments(&list_node_info_req);
        let client = self.get_connection().await?;

        let dir_path = collection_path(&segments);
        let entities = client
            .list(&dir_path, Depth::Number(1))
            .await
            .map_err(|e| anyhow!("WebDAV list failed: {}", e))?;

        let self_norm = self.self_path(&segments);
        let mut folders: Vec<String> = vec![];
        let mut files: Vec<(String, i64)> = vec![];
        for entity in entities {
            match entity {
                ListEntity::Folder(f) => {
                    let path = decode_path(href_to_path(&f.href));
                    if self.normalize(&path) == self_norm {
                        continue;
                    }
                    if let Some(name) = name_of(&path) {
                        folders.push(name);
                    }
                }
                ListEntity::File(f) => {
                    let path = decode_path(href_to_path(&f.href));
                    if self.normalize(&path) == self_norm {
                        continue;
                    }
                    if let Some(name) = name_of(&path) {
                        files.push((name, f.content_length));
                    }
                }
            }
        }
        folders.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
        files.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));

        let mut items = vec![];
        for name in folders {
            items.push(ListNodeInfoResponseItem::new(
                true,
                true,
                "folder".to_string(),
                name,
                None,
            ));
        }
        for (name, content_length) in files {
            items.push(ListNodeInfoResponseItem::new(
                false,
                true,
                "textFile".to_string(),
                name,
                Some(human_bytes(content_length as f64)),
            ));
        }
        Ok(ListNodeInfoResponse::new(items))
    }

    pub async fn get_object_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        is_folder: bool,
    ) -> Result<GetObjectInfoRes, anyhow::Error> {
        info!("webdav get_object_info: {:?}", list_node_info_req);
        let segments = self.dir_segments(&list_node_info_req);
        let name = segments
            .last()
            .ok_or(anyhow!("Invalid webdav path"))?
            .clone();
        let client = self.get_connection().await?;

        let path = object_path(&segments, is_folder);
        let entities = client
            .list(&path, Depth::Number(0))
            .await
            .map_err(|e| anyhow!("WebDAV propfind failed: {}", e))?;

        match entities.into_iter().next() {
            Some(ListEntity::File(f)) => Ok(GetObjectInfoRes::new(
                name,
                human_bytes(f.content_length as f64),
                f.last_modified.to_string(),
                f.tag.unwrap_or_default(),
                f.content_type,
            )),
            Some(ListEntity::Folder(f)) => Ok(GetObjectInfoRes::new(
                format!("{}/", name),
                f.quota_used_bytes
                    .map(|q| human_bytes(q as f64))
                    .unwrap_or_else(|| "-".to_string()),
                f.last_modified.to_string(),
                f.tag.unwrap_or_default(),
                "WebDAV Folder".to_string(),
            )),
            None => Err(anyhow!("WebDAV object not found")),
        }
    }

    pub async fn download_file(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        destination: String,
        is_folder: bool,
    ) -> Result<(), anyhow::Error> {
        info!(
            "webdav download_file: {:?},destination:{},is_folder:{}",
            list_node_info_req, destination, is_folder
        );
        let segments = self.dir_segments(&list_node_info_req);
        let client = self.get_connection().await?;

        if !is_folder {
            let remote = object_path(&segments, false);
            let resp = client
                .get(&remote)
                .await
                .map_err(|e| anyhow!("WebDAV download failed: {}", e))?;
            let mut file = File::create(&destination).await?;
            let mut stream = resp.bytes_stream();
            while let Some(bytes) = stream.try_next().await? {
                file.write_all(&bytes).await?;
            }
            file.flush().await?;
            return Ok(());
        }

        let folder_name = segments
            .last()
            .ok_or(anyhow!("Invalid webdav path"))?
            .clone();
        let local_base = Path::new(&destination).join(&folder_name);
        tokio::fs::create_dir_all(&local_base).await?;
        self.download_dir_recursive(&client, &segments, &local_base)
            .await
    }

    async fn download_dir_recursive(
        &self,
        client: &DavClient,
        dir_segments: &[String],
        local_dir: &Path,
    ) -> Result<(), anyhow::Error> {
        let dir_path = collection_path(dir_segments);
        let entities = client
            .list(&dir_path, Depth::Number(1))
            .await
            .map_err(|e| anyhow!("WebDAV list failed: {}", e))?;

        let self_norm = self.self_path(dir_segments);
        for entity in entities {
            match entity {
                ListEntity::Folder(f) => {
                    let path = decode_path(href_to_path(&f.href));
                    if self.normalize(&path) == self_norm {
                        continue;
                    }
                    let name = name_of(&path).ok_or(anyhow!("Invalid webdav folder name"))?;
                    let child_local = local_dir.join(&name);
                    tokio::fs::create_dir_all(&child_local).await?;
                    let mut child_segments = dir_segments.to_vec();
                    child_segments.push(name);
                    Box::pin(self.download_dir_recursive(client, &child_segments, &child_local))
                        .await?;
                }
                ListEntity::File(f) => {
                    let path = decode_path(href_to_path(&f.href));
                    let name = name_of(&path).ok_or(anyhow!("Invalid webdav file name"))?;
                    let remote = child_path(dir_segments, &name, false);
                    let resp = client
                        .get(&remote)
                        .await
                        .map_err(|e| anyhow!("WebDAV download failed: {}", e))?;
                    let mut file = File::create(local_dir.join(&name)).await?;
                    let mut stream = resp.bytes_stream();
                    while let Some(bytes) = stream.try_next().await? {
                        file.write_all(&bytes).await?;
                    }
                    file.flush().await?;
                }
            }
        }
        Ok(())
    }

    pub async fn upload_file(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        local_file_path: String,
    ) -> Result<(), anyhow::Error> {
        info!(
            "webdav upload_file: {:?},local_file_path:{}",
            list_node_info_req, local_file_path
        );
        let segments = self.dir_segments(&list_node_info_req);
        let file_name = Path::new(&local_file_path)
            .file_name()
            .ok_or(anyhow!(""))?
            .to_str()
            .ok_or(anyhow!(""))?
            .to_string();
        let client = self.get_connection().await?;

        let remote = child_path(&segments, &file_name, false);
        let mut file = File::open(&local_file_path).await?;
        let mut contents = Vec::new();
        file.read_to_end(&mut contents).await?;
        client
            .put(&remote, contents)
            .await
            .map_err(|e| anyhow!("WebDAV upload failed: {}", e))?;
        Ok(())
    }

    pub async fn upload_file_multipart<F: Fn(u64, u64) + Send + 'static>(
        &self,
        list_node_info_req: ListNodeInfoReq,
        local_file_path: String,
        on_progress: F,
    ) -> Result<(), anyhow::Error> {
        info!(
            "webdav upload_file_multipart: {:?},local_file_path:{}",
            list_node_info_req, local_file_path
        );
        let segments = self.dir_segments(&list_node_info_req);
        let file_name = Path::new(&local_file_path)
            .file_name()
            .ok_or(anyhow!(""))?
            .to_str()
            .ok_or(anyhow!(""))?
            .to_string();
        let client = self.get_connection().await?;

        let remote = child_path(&segments, &file_name, false);
        let total = tokio::fs::metadata(&local_file_path).await?.len();
        let file = File::open(&local_file_path).await?;
        let state = UploadState {
            file,
            total,
            uploaded: 0,
            on_progress: Box::new(on_progress),
        };
        // WebDAV has no multipart upload; stream the PUT body in chunks and
        // report progress as chunks are read.
        let stream = futures_util::stream::unfold(state, |mut st| async move {
            let mut buf = vec![0u8; 512 * 1024];
            match st.file.read(&mut buf).await {
                Ok(0) => None,
                Ok(n) => {
                    buf.truncate(n);
                    st.uploaded += n as u64;
                    (st.on_progress)(st.uploaded, st.total);
                    Some((Ok::<Vec<u8>, std::io::Error>(buf), st))
                }
                Err(e) => Some((Err::<Vec<u8>, std::io::Error>(e), st)),
            }
        });
        let body = reqwest::Body::wrap_stream(stream);
        client
            .put(&remote, body)
            .await
            .map_err(|e| anyhow!("WebDAV upload failed: {}", e))?;
        Ok(())
    }

    pub async fn create_folder(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        folder_name: String,
    ) -> Result<(), anyhow::Error> {
        info!(
            "webdav create_folder: {:?},folder_name:{}",
            list_node_info_req, folder_name
        );
        let segments = self.dir_segments(&list_node_info_req);
        let client = self.get_connection().await?;

        let remote = child_path(&segments, &folder_name, true);
        client
            .mkcol(&remote)
            .await
            .map_err(|e| anyhow!("WebDAV create folder failed: {}", e))?;
        Ok(())
    }

    // Deleting files and folders both map to HTTP DELETE; collections on some
    // servers only accept the trailing-slash form, so retry once with it.
    pub async fn delete_object(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        info!("webdav delete_object: {:?}", list_node_info_req);
        let segments = self.dir_segments(&list_node_info_req);
        if segments.is_empty() {
            return Err(anyhow!("Nothing to delete"));
        }
        let client = self.get_connection().await?;

        let remote = encoded_dir(&segments);
        match client.delete(&remote).await {
            Ok(()) => Ok(()),
            Err(e) => match client.delete(&format!("{}/", remote)).await {
                Ok(()) => Ok(()),
                Err(_) => Err(anyhow!("WebDAV delete failed: {}", e)),
            },
        }
    }

    // Renaming maps to the WebDAV MOVE verb: same parent directory, new last
    // segment. Collection paths keep a trailing slash for picky servers.
    pub async fn rename_object(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        new_name: String,
        is_folder: bool,
    ) -> Result<(), anyhow::Error> {
        info!(
            "webdav rename_object: {:?},new_name:{},is_folder:{}",
            list_node_info_req, new_name, is_folder
        );
        let mut segments = self.dir_segments(&list_node_info_req);
        if segments.is_empty() {
            return Err(anyhow!("Nothing to rename"));
        }
        let new_name = new_name.trim().to_string();
        if new_name.is_empty() || new_name.contains('/') || new_name == "." || new_name == ".." {
            return Err(anyhow!("Invalid new name"));
        }

        let from = object_path(&segments, is_folder);
        *segments.last_mut().unwrap() = new_name;
        let to = object_path(&segments, is_folder);
        if from == to {
            return Ok(());
        }

        let client = self.get_connection().await?;
        client
            .mv(&from, &to)
            .await
            .map_err(|e| anyhow!("WebDAV rename failed: {}", e))
    }

    // Copying maps to the WebDAV COPY verb (Depth defaults to infinity, so a
    // folder is copied with all nested content). The target directory is a
    // remote path relative to the connection root, e.g. "docs" or "docs/2024".
    pub async fn copy_object(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        target_dir: String,
        is_folder: bool,
    ) -> Result<(), anyhow::Error> {
        info!(
            "webdav copy_object: {:?},target_dir:{},is_folder:{}",
            list_node_info_req, target_dir, is_folder
        );
        let segments = self.dir_segments(&list_node_info_req);
        if segments.is_empty() {
            return Err(anyhow!("Nothing to copy"));
        }
        let target_segments = parse_target_dir(&target_dir);
        let source_parent: Vec<String> = segments[..segments.len() - 1].to_vec();
        if target_segments == source_parent {
            return Err(anyhow!("目标目录不能与当前目录相同"));
        }
        let name = segments.last().unwrap().clone();

        let from = object_path(&segments, is_folder);
        let to = child_path(&target_segments, &name, is_folder);

        let client = self.get_connection().await?;
        client
            .cp(&from, &to)
            .await
            .map_err(|e| anyhow!("WebDAV copy failed: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> WebdavConfig {
        WebdavConfig {
            config: WebdavStruct {
                host: "127.0.0.1".to_string(),
                port: 39080,
                username: "testuser".to_string(),
                password: "testpass".to_string(),
                root_path: "/dav".to_string(),
                use_tls: false,
            },
        }
    }

    #[test]
    fn test_path_helpers() {
        assert_eq!(encode_segment("a b"), "a%20b");
        assert_eq!(encode_segment("文件"), "%E6%96%87%E4%BB%B6");
        assert_eq!(encode_segment("a-b.c_d~e"), "a-b.c_d~e");
        assert_eq!(collection_path(&[]), "/");
        assert_eq!(collection_path(&["a".into(), "b c".into()]), "/a/b%20c/");
        assert_eq!(object_path(&["a".into(), "f".into()], false), "/a/f");
        assert_eq!(object_path(&["a".into()], true), "/a/");
        assert_eq!(child_path(&[], "f.txt", false), "/f.txt");
        assert_eq!(
            child_path(&["a".into()], "新 建".into(), true),
            "/a/%E6%96%B0%20%E5%BB%BA/"
        );
        assert_eq!(href_to_path("https://h:1/dav/x/"), "/dav/x/");
        assert_eq!(href_to_path("/dav/x/"), "/dav/x/");
        assert_eq!(decode_path("/dav/a%20b"), "/dav/a b");
        assert_eq!(name_of("/dav/docs/"), Some("docs".to_string()));
        assert_eq!(name_of("/dav/a b.txt"), Some("a b.txt".to_string()));
        assert_eq!(name_of("/"), None);
    }

    #[test]
    fn test_parse_target_dir() {
        assert_eq!(parse_target_dir(""), Vec::<String>::new());
        assert_eq!(parse_target_dir("/"), Vec::<String>::new());
        assert_eq!(parse_target_dir("  "), Vec::<String>::new());
        assert_eq!(
            parse_target_dir(" docs //2024/ "),
            vec!["docs".to_string(), "2024".to_string()]
        );
        assert_eq!(parse_target_dir("/a b/c"), vec!["a b".to_string(), "c".to_string()]);
    }

    #[test]
    fn test_rename_and_copy_destination_paths() {
        // rename keeps the sibling path shape (folder trailing slash included)
        let mut segments = vec!["docs".to_string(), "旧 名".to_string()];
        assert_eq!(object_path(&segments, true), "/docs/%E6%97%A7%20%E5%90%8D/");
        *segments.last_mut().unwrap() = "新名".to_string();
        assert_eq!(object_path(&segments, true), "/docs/%E6%96%B0%E5%90%8D/");
        assert_eq!(object_path(&segments, false), "/docs/%E6%96%B0%E5%90%8D");

        // copy lands inside the parsed target dir, keeping the source name
        let source = vec!["docs".to_string(), "f.txt".to_string()];
        let target = parse_target_dir(" backup//2024 ");
        assert_eq!(
            child_path(&target, source.last().unwrap(), false),
            "/backup/2024/f.txt"
        );
    }

    #[test]
    fn test_self_path_matching() {
        let config = test_config();
        assert_eq!(config.self_path(&[]), "/dav");
        assert_eq!(config.self_path(&["docs".into(), "a".into()]), "/dav/docs/a");
        assert_eq!(config.normalize("/dav/docs/"), "/dav/docs");
    }

    #[test]
    fn test_base_url() {
        let mut config = test_config();
        assert_eq!(config.base_url(), "http://127.0.0.1:39080/dav");
        config.config.root_path = "/".to_string();
        assert_eq!(config.base_url(), "http://127.0.0.1:39080");
        config.config.host = "https://dav.example.com".to_string();
        assert_eq!(config.base_url(), "https://dav.example.com:39080");
    }

    fn req(segments: &[&str]) -> ListNodeInfoReq {
        ListNodeInfoReq {
            level_infos: std::iter::once("1")
                .chain(segments.iter().copied())
                .enumerate()
                .map(|(i, v)| crate::vojo::list_node_info_req::ListNodeInfoReqItem {
                    level: i as i32 + 1,
                    config_value: v.to_string(),
                })
                .collect(),
        }
    }

    async fn memory_appstate() -> AppState {
        use std::str::FromStr;
        let options = sqlx::sqlite::SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = sqlx::sqlite::SqlitePool::connect_with(options).await.unwrap();
        AppState { pool }
    }

    // End-to-end test against a local WebDAV server. Skipped unless
    // EASYVIEWER_WEBDAV_E2E is set; the server must listen on
    // http://127.0.0.1:39080/dav with testuser/testpass (Basic auth).
    #[tokio::test]
    async fn webdav_end_to_end_local_server() {
        if std::env::var("EASYVIEWER_WEBDAV_E2E").is_err() {
            return;
        }
        let config = test_config();
        let appstate = memory_appstate().await;

        config.test_connection().await.unwrap();

        let empty = config.list_node_info(req(&[]), &appstate).await.unwrap();
        assert!(empty.list.is_empty());

        config
            .create_folder(req(&[]), &appstate, "docs".to_string())
            .await
            .unwrap();
        let listed = config.list_node_info(req(&[]), &appstate).await.unwrap();
        assert_eq!(listed.list.len(), 1);
        assert_eq!(listed.list[0].name, "docs");
        assert_eq!(listed.list[0].icon_name, "folder");

        let tmp = std::env::temp_dir().join("webdav_e2e_upload.txt");
        std::fs::write(&tmp, b"hello webdav").unwrap();
        let uploaded = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0));
        let sink = uploaded.clone();
        config
            .upload_file_multipart(
                req(&["docs"]),
                tmp.to_str().unwrap().to_string(),
                move |u, t| {
                    assert_eq!(t, 12);
                    sink.store(u, std::sync::atomic::Ordering::SeqCst);
                },
            )
            .await
            .unwrap();
        assert_eq!(uploaded.load(std::sync::atomic::Ordering::SeqCst), 12);

        let docs = config.list_node_info(req(&["docs"]), &appstate).await.unwrap();
        assert_eq!(docs.list.len(), 1);
        assert_eq!(docs.list[0].name, "webdav_e2e_upload.txt");
        assert_eq!(docs.list[0].icon_name, "textFile");

        let info = config
            .get_object_info(req(&["docs", "webdav_e2e_upload.txt"]), &appstate, false)
            .await
            .unwrap();
        assert_eq!(info.name, "webdav_e2e_upload.txt");
        assert_eq!(info.size, "12 B");

        let dst = std::env::temp_dir().join("webdav_e2e_download.txt");
        config
            .download_file(
                req(&["docs", "webdav_e2e_upload.txt"]),
                &appstate,
                dst.to_str().unwrap().to_string(),
                false,
            )
            .await
            .unwrap();
        assert_eq!(std::fs::read(&dst).unwrap(), b"hello webdav");

        let dst_dir = std::env::temp_dir().join("webdav_e2e_download_dir");
        let _ = std::fs::remove_dir_all(&dst_dir);
        config
            .download_file(
                req(&["docs"]),
                &appstate,
                dst_dir.to_str().unwrap().to_string(),
                true,
            )
            .await
            .unwrap();
        assert_eq!(
            std::fs::read(dst_dir.join("docs").join("webdav_e2e_upload.txt")).unwrap(),
            b"hello webdav"
        );

        // A filename with a space and non-ASCII characters must round-trip
        let tmp2 = std::env::temp_dir().join("文件 名.txt");
        std::fs::write(&tmp2, b"unicode name").unwrap();
        config
            .upload_file(req(&["docs"]), &appstate, tmp2.to_str().unwrap().to_string())
            .await
            .unwrap();
        let docs2 = config.list_node_info(req(&["docs"]), &appstate).await.unwrap();
        assert!(docs2.list.iter().any(|i| i.name == "文件 名.txt"));

        // Rename the unicode file, then copy it to the connection root
        config
            .rename_object(
                req(&["docs", "文件 名.txt"]),
                &appstate,
                "改名.txt".to_string(),
                false,
            )
            .await
            .unwrap();
        let docs3 = config.list_node_info(req(&["docs"]), &appstate).await.unwrap();
        assert!(!docs3.list.iter().any(|i| i.name == "文件 名.txt"));
        assert!(docs3.list.iter().any(|i| i.name == "改名.txt"));

        config
            .copy_object(req(&["docs", "改名.txt"]), &appstate, "/".to_string(), false)
            .await
            .unwrap();
        let root_after_copy = config.list_node_info(req(&[]), &appstate).await.unwrap();
        assert!(root_after_copy.list.iter().any(|i| i.name == "改名.txt"));

        // Copying into the source's own directory must be rejected
        assert!(
            config
                .copy_object(req(&["docs", "改名.txt"]), &appstate, "docs".to_string(), false)
                .await
                .is_err()
        );

        config
            .delete_object(req(&["改名.txt"]), &appstate)
            .await
            .unwrap();

        // Rename a folder (with nested content), then delete it recursively
        config
            .rename_object(req(&["docs"]), &appstate, "docs_renamed".to_string(), true)
            .await
            .unwrap();
        let renamed_dir = config
            .list_node_info(req(&["docs_renamed"]), &appstate)
            .await
            .unwrap();
        assert!(renamed_dir.list.iter().any(|i| i.name == "webdav_e2e_upload.txt"));

        config
            .delete_object(req(&["docs_renamed"]), &appstate)
            .await
            .unwrap();
        let after = config.list_node_info(req(&[]), &appstate).await.unwrap();
        assert!(after.list.is_empty());
    }
}
