use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::AppState;
use aws_sdk_s3::config::Credentials;
use aws_sdk_s3::config::Region;
use aws_sdk_s3::config::SharedCredentialsProvider;
use aws_sdk_s3::Client;
use aws_sdk_s3::Config;
use serde::Deserialize;
use serde::Serialize;

use crate::vojo::list_node_info_response::ListNodeInfoResponse;
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
                info!("bucket_name: {}", bucket_name);
                let client = self.get_connection().await?;
                info!("before list_objects_v2");
                let resp = client.list_objects_v2().bucket(bucket_name).send().await?;
                info!("after list_objects_v2");

                // Iterate over objects and print their keys (which represent the "files" in S3)
                for object in resp.contents() {
                    let key = object.key().unwrap_or_default();
                    println!("Object: {}", key);
                }

                // If you're looking for "directories", check if the objects have a prefix (i.e., "folder")
                let prefixes = resp.common_prefixes();
                for prefix in prefixes {
                    let prefix = prefix.prefix().unwrap_or_default();
                    println!("Directory (prefix): {}", prefix);
                }
            }
            _ => {
                info!("level_infos: {}", list.len());
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

        let endpoint = format!("http://{}:{}", self.config.host, self.config.port);
        let config = Config::builder()
            .endpoint_url(endpoint)
            .region(Region::new(region))
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
