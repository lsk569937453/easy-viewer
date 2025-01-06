use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use aws_sdk_s3::config::endpoint::Endpoint;
use aws_sdk_s3::config::Credentials;
use aws_sdk_s3::config::Region;
use aws_sdk_s3::config::SharedCredentialsProvider;
// use aws_sdk_s3::model::PutObjectRequest;
// use aws_sdk_s3::types::ByteStream;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
use aws_sdk_s3::Config;
use human_bytes::human_bytes;
use itertools::Itertools;
use serde::Deserialize;
use serde::Serialize;
use std::i32;
use std::path::Path;
use walkdir::WalkDir;

use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

use tokio::io::AsyncWriteExt;

#[derive(Deserialize, Serialize, Clone)]
pub struct S3Config {
    pub config: S3Struct,
}
#[derive(Deserialize, Serialize, Clone)]

pub struct S3Struct {
    pub host: String,
    pub port: i32,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
}
impl S3Config {
    pub async fn upload_folder(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        local_directory: String,
    ) -> Result<(), anyhow::Error> {
        info!(
            "upload_folder: {:?},local_directory:{}",
            list_node_info_req, local_directory
        );
        let list = list_node_info_req.level_infos;

        let bucket_name = list[1].config_value.clone();
        let s3_client = self.get_connection().await?;

        let object_key_prefix = list
            .iter()
            .skip(2)
            .map(|item| item.config_value.clone())
            .join("/");
        let path = Path::new(&local_directory);
        let dir_name = path
            .file_name()
            .ok_or(anyhow!(""))?
            .to_str()
            .ok_or(anyhow!(""))?
            .to_string();
        for entry_res in WalkDir::new(local_directory.clone()) {
            let entry = entry_res?;
            let local_file_path = entry.path().display().to_string();
            let mut s3_object_key = if local_directory == local_file_path {
                let s3_object_key_endfix = entry
                    .path()
                    .file_name()
                    .ok_or(anyhow!(""))?
                    .to_str()
                    .ok_or(anyhow!(""))?;
                let s3_object_key = format!("{}/{}", object_key_prefix, s3_object_key_endfix);
                s3_object_key
            } else {
                let mut s3_object_key_endfix = local_file_path.replace(&local_directory, "");
                s3_object_key_endfix = s3_object_key_endfix.replace(std::path::MAIN_SEPARATOR, "/");
                let s3_object_key =
                    format!("{}/{}{}", object_key_prefix, dir_name, s3_object_key_endfix);
                s3_object_key
            };

            let is_dir = entry.path().is_dir();
            if is_dir {
                s3_object_key.push('/');
                debug!(
                    "s3 path:{},local_file_path:{}",
                    s3_object_key.clone(),
                    local_file_path,
                );
                s3_client
                    .put_object()
                    .bucket(bucket_name.clone())
                    .key(s3_object_key.clone())
                    .send()
                    .await?;
            } else {
                let mut file = File::open(local_file_path.clone()).await?;
                let mut file_contents = Vec::new();
                file.read_to_end(&mut file_contents).await?;

                let byte_stream = ByteStream::from(file_contents);
                debug!(
                    "s3 path:{},local_file_path:{}",
                    s3_object_key.clone(),
                    local_file_path
                );

                s3_client
                    .put_object()
                    .bucket(bucket_name.clone())
                    .key(s3_object_key.clone())
                    .body(byte_stream)
                    .send()
                    .await?;
            }
            debug!("{},s3_object_key:{}", entry.path().display(), s3_object_key);
        }

        Ok(())
    }

    pub async fn download_bucket(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        local_file_path: String,
    ) -> Result<(), anyhow::Error> {
        info!("delete_bucket:   {:?}", list_node_info_req);

        let list = list_node_info_req.level_infos;

        let bucket_name = list[1].config_value.clone();
        let s3_client = self.get_connection().await?;
        let objects = s3_client
            .list_objects_v2()
            .bucket(bucket_name.clone())
            .send()
            .await?;

        for object in objects.contents() {
            let key = object.key().ok_or(anyhow!(""))?;

            if key.ends_with("/") {
                let s3_path: Vec<&str> = key.split("/").collect();
                let mut local_path = PathBuf::from(&local_file_path);
                local_path.extend(s3_path.iter());
                std::fs::create_dir_all(local_path.as_path())?;
                continue;
            }
            let s3_path: Vec<&str> = key.split("/").collect();
            let mut local_path = PathBuf::from(&local_file_path);
            local_path.extend(s3_path.iter());
            let mut file = tokio::fs::File::create(local_path).await?;
            let resp = s3_client
                .get_object()
                .bucket(bucket_name.clone())
                .key(key)
                .send()
                .await?;
            let mut stream = resp.body;
            info!("file: {}", local_file_path);
            while let Some(bytes) = stream.try_next().await? {
                file.write_all(&bytes).await?;
            }
        }
        Ok(())
    }
    pub async fn delete_bucket(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        info!("delete_bucket: {:?}", list_node_info_req);

        let list = list_node_info_req.level_infos;

        let bucket_name = list[1].config_value.clone();
        let s3_client = self.get_connection().await?;
        let mut continuation_token: Option<String> = None;

        loop {
            let mut builder = s3_client
                .list_objects_v2()
                .bucket(bucket_name.clone())
                .max_keys(i32::MAX);
            if let Some(token) = continuation_token {
                builder = builder.continuation_token(token);
            }
            let res = builder.send().await?;

            let mut count = 0;
            let mut total = 0;

            for object in res.contents() {
                total += 1;
                if let Some(key) = object.key() {
                    count += 1;
                    info!("key: {}", key);
                    s3_client
                        .delete_object()
                        .bucket(bucket_name.clone())
                        .key(key)
                        .send()
                        .await?;
                }
            }
            if let Some(next_token) = res.next_continuation_token() {
                continuation_token = Some(next_token.to_string());
            } else {
                break; // No more pages
            }
            info!("total: {},count: {}", total, count);
        }
        // s3_client.delete_bucket().bucket(bucket_name).send().await?;
        Ok(())
    }

    pub async fn create_folder(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        folder_name: String,
    ) -> Result<(), anyhow::Error> {
        info!(
            "create_folder: {:?},folder_name:{}",
            list_node_info_req, folder_name
        );
        let list = list_node_info_req.level_infos;

        let bucket_name = list[1].config_value.clone();
        let s3_client = self.get_connection().await?;

        let object_key_prefix = list
            .iter()
            .skip(2)
            .map(|item| item.config_value.clone())
            .join("/");
        let object_key = format!("{}/{}/", object_key_prefix, folder_name);
        info!(
            "object_path_prefix: {},object_key:{}",
            object_key_prefix, object_key
        );
        s3_client
            .put_object()
            .bucket(bucket_name)
            .key(object_key)
            .send()
            .await?;
        Ok(())
    }
    pub async fn upload_file(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        local_file_path: String,
    ) -> Result<(), anyhow::Error> {
        info!(
            "uploadfile: {:?},local_file_path:{}",
            list_node_info_req, local_file_path
        );
        let list = list_node_info_req.level_infos;
        let path = Path::new(&local_file_path);

        let bucket_name = list[1].config_value.clone();
        let s3_client = self.get_connection().await?;

        let object_key_prefix = list
            .iter()
            .skip(2)
            .map(|item| item.config_value.clone())
            .join("/");

        let object_key = format!(
            "{}/{}",
            object_key_prefix,
            path.file_name()
                .ok_or(anyhow!(""))?
                .to_str()
                .ok_or(anyhow!(""))?
        );
        info!(
            "object_path_prefix: {},object_key:{}",
            object_key_prefix, object_key
        );
        let mut file = File::open(local_file_path).await?;
        let mut file_contents = Vec::new();
        file.read_to_end(&mut file_contents).await?;

        let byte_stream = ByteStream::from(file_contents);

        s3_client
            .put_object()
            .bucket(bucket_name)
            .key(object_key)
            .body(byte_stream)
            .send()
            .await?;
        Ok(())
    }
    pub async fn download_file(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        local_file_path: String,
    ) -> Result<(), anyhow::Error> {
        info!(
            "download_file: {:?},local_file_path:{}",
            list_node_info_req, local_file_path
        );
        let list = list_node_info_req.level_infos;

        let bucket_name = list[1].config_value.clone();
        let s3_client = self.get_connection().await?;

        let object_key = list
            .iter()
            .skip(2)
            .map(|item| item.config_value.clone())
            .join("/");
        info!("object_path: {}", object_key);
        let get_object_output = s3_client
            .get_object()
            .bucket(bucket_name)
            .key(object_key)
            .send()
            .await?;
        let byte_stream = get_object_output.body;
        let data = byte_stream.collect().await?;

        let mut file = File::create(local_file_path.clone()).await?;
        file.write_all(data.to_vec().as_slice()).await?;

        info!("File downloaded to {}", local_file_path);
        Ok(())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let list = list_node_info_req.level_infos;
        let mut vecs = vec![];
        match list.len() {
            1 => {
                let client = self.get_connection().await?;
                let bucket_list = client
                    .list_buckets()
                    .send()
                    .await
                    .map_err(|_e| anyhow!("Connect timeout."))?;
                for item in bucket_list.buckets() {
                    let bucket_name = item.name().ok_or(anyhow!(""))?;

                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "bucket".to_string(),
                        bucket_name.to_string(),
                        None,
                    );
                    vecs.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vecs));
            }
            2 => {
                let bucket_name = list[1].config_value.clone();
                let client = self.get_connection().await?;
                let resp = client
                    .list_objects_v2()
                    .delimiter("/")
                    .bucket(bucket_name.clone())
                    .send()
                    .await?;
                let prefixes = resp.common_prefixes();
                for prefix in prefixes {
                    let prefix = prefix.prefix().unwrap_or_default().replace("/", "");
                    vecs.push(ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "folder".to_string(),
                        prefix.to_string(),
                        None,
                    ));
                }

                for object in resp.contents() {
                    let key = object.key().unwrap_or_default();
                    let content_length = client
                        .head_object()
                        .bucket(bucket_name.clone())
                        .key(key)
                        .send()
                        .await?
                        .content_length()
                        .unwrap_or_default();
                    info!("content_length: {}", content_length);
                    let list_node_item = ListNodeInfoResponseItem::new(
                        false,
                        true,
                        "textFile".to_string(),
                        key.to_string(),
                        Some(human_bytes(content_length as f64)),
                    );

                    vecs.push(list_node_item);
                }

                return Ok(ListNodeInfoResponse::new(vecs));
            }
            _ => {
                let bucket_name = list[1].config_value.clone();
                let client = self.get_connection().await?;

                let prefix = list
                    .iter()
                    .skip(2)
                    .map(|item| item.config_value.clone())
                    .join("/");
                info!("level_infos: {}", list.len());
                info!("prefix: {}", prefix);
                let prefix = format!("{}/", prefix);
                let resp = client
                    .list_objects_v2()
                    .prefix(prefix.clone())
                    .delimiter("/")
                    .bucket(bucket_name.clone())
                    .send()
                    .await?;
                info!("after list_objects_v2");
                let prefixes = resp.common_prefixes();
                for prefix in prefixes {
                    let mut prefix_str = prefix.prefix().unwrap_or_default().to_string();
                    prefix_str.pop();
                    let prefix = prefix_str.split("/").last().unwrap();
                    vecs.push(ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "folder".to_string(),
                        prefix.to_string(),
                        None,
                    ));
                }
                for object in resp.contents() {
                    let key = object.key().unwrap_or_default();
                    if key == prefix {
                        continue;
                    }
                    let content_length = client
                        .head_object()
                        .bucket(bucket_name.clone())
                        .key(key)
                        .send()
                        .await?
                        .content_length()
                        .unwrap_or_default();
                    info!("content_length: {}", content_length);
                    let file_name = key.split("/").last().unwrap_or_default();
                    let list_node_item = ListNodeInfoResponseItem::new(
                        false,
                        true,
                        "textFile".to_string(),
                        file_name.to_string(),
                        Some(human_bytes(content_length as f64)),
                    );

                    vecs.push(list_node_item);
                }

                return Ok(ListNodeInfoResponse::new(vecs));
            }
        }

        Ok(ListNodeInfoResponse::new_with_empty())
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let _ = self.get_connection().await?;
        Ok(())
    }
    async fn get_connection(&self) -> Result<Client, anyhow::Error> {
        let access_key = self.config.access_key.clone();
        let secret_key = self.config.secret_key.clone();
        let region = self.config.region.clone();
        let credentials = Credentials::from_keys(access_key.clone(), secret_key, None);

        let endpoint = Endpoint::builder()
            .url(format!("http://{}:{}", self.config.host, self.config.port))
            .build();
        let config = Config::builder()
            .endpoint_url(format!("http://{}:{}", self.config.host, self.config.port))
            .region(Region::new(region))
            .force_path_style(true)
            .credentials_provider(SharedCredentialsProvider::new(credentials))
            .build();

        let client = Client::from_conf(config);
        info!("access_key: {}", access_key);
        client
            .list_buckets()
            .send()
            .await
            .map_err(|_e| anyhow!("Connect timeout."))?;
        Ok(client)
    }
}
