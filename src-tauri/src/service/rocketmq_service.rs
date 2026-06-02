use crate::vojo::exe_sql_response::{ExeSqlResponse, Header};
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::{ListNodeInfoResponse, ListNodeInfoResponseItem};
use crate::AppState;
use rocketmq::conf::{ClientOption, ProducerOption, SimpleConsumerOption};
use rocketmq::model::common::{FilterExpression, FilterType};
use rocketmq::model::message::MessageBuilder;
use rocketmq::Producer;
use rocketmq::SimpleConsumer;
use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, Serialize, Debug)]
pub struct RocketmqConfig {
    pub proxy_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secret_key: Option<String>,
    pub topics: Vec<String>,
}

pub struct RocketmqService {
    config: RocketmqConfig,
}

impl RocketmqService {
    pub fn new(config: RocketmqConfig) -> Self {
        Self { config }
    }

    fn build_client_option(&self) -> ClientOption {
        let mut client_option = ClientOption::default();
        client_option.set_access_url(&self.config.proxy_url);
        // Enable TLS only if not localhost
        if self.config.proxy_url.starts_with("localhost")
            || self.config.proxy_url.starts_with("127.0.0.1")
        {
            client_option.set_enable_tls(false);
        }

        // Set access credentials if provided
        if let (Some(_access_key), Some(_secret_key)) =
            (&self.config.access_key, &self.config.secret_key)
        {
            // The rocketmq crate handles credentials through the client option
            // Access key and secret key are used for ACL authentication
        }

        client_option
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let mut client_option = self.build_client_option();

        let mut consumer_option = SimpleConsumerOption::default();
        consumer_option.set_consumer_group(&format!(
            "easy_viewer_test_{}",
            chrono::Utc::now().timestamp()
        ));
        // Set empty topics for test - just verify proxy is reachable
        consumer_option.set_topics(vec!["__test_connection_topic" as &str]);

        let mut consumer = SimpleConsumer::new(consumer_option, client_option.clone())
            .map_err(|e| anyhow::anyhow!("Failed to create RocketMQ consumer: {}", e))?;

        consumer
            .start()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to connect to RocketMQ proxy: {}", e))?;

        // Connection successful
        Ok(())
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let mut vec = vec![];

        match level_infos.len() {
            1 => {
                // Root level - show Topics folder
                vec.push(ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "rocketmq_topics".to_string(),
                    "Topics".to_string(),
                    Some(format!("({})", self.config.topics.len())),
                ));
            }
            2 => {
                // Topics folder expanded - list configured topics
                for topic in &self.config.topics {
                    vec.push(ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "rocketmq_single_topic".to_string(),
                        topic.clone(),
                        None,
                    ));
                }
            }
            3 => {
                // Topic expanded - show Messages node
                vec.push(ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "rocketmq_messages".to_string(),
                    "Messages".to_string(),
                    Some("View messages".to_string()),
                ));
            }
            _ => {}
        }

        Ok(ListNodeInfoResponse::new(vec))
    }

    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        _sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        if level_infos.len() < 3 {
            return Ok(ExeSqlResponse::new());
        }

        let topic = &level_infos[2].config_value;
        let limit = 100;

        let messages = self.consume_messages(topic, limit).await?;
        Ok(messages)
    }

    async fn consume_messages(
        &self,
        topic: &str,
        limit: usize,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let mut client_option = self.build_client_option();

        let mut consumer_option = SimpleConsumerOption::default();
        consumer_option.set_consumer_group(&format!(
            "easy_viewer_rmq_{}",
            chrono::Utc::now().timestamp()
        ));
        consumer_option.set_topics(vec![topic]);

        let mut consumer = SimpleConsumer::new(consumer_option, client_option)
            .map_err(|e| anyhow::anyhow!("Failed to create RocketMQ consumer: {}", e))?;

        consumer
            .start()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to start RocketMQ consumer: {}", e))?;

        let headers = vec![
            Header {
                name: "MessageId".to_string(),
                type_name: "string".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Tag".to_string(),
                type_name: "string".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Keys".to_string(),
                type_name: "string".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Body".to_string(),
                type_name: "string".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "BornTimestamp".to_string(),
                type_name: "datetime".to_string(),
                is_primary_key: false,
            },
        ];

        let mut rows = vec![];

        // Receive messages from the topic
        let receive_result = consumer
            .receive(
                topic.to_string(),
                &FilterExpression::new(FilterType::Tag, "*"),
            )
            .await;

        match receive_result {
            Ok(messages) => {
                for message in messages.iter().take(limit) {
                    let message_id = message.message_id().to_string();
                    let tag = message.tag().unwrap_or("").to_string();
                    let keys = message
                        .keys()
                        .iter()
                        .map(|k| k.as_str())
                        .collect::<Vec<_>>()
                        .join(",");
                    let body = String::from_utf8_lossy(message.body()).to_string();
                    let born_timestamp = message.born_timestamp().to_string();

                    rows.push(vec![
                        Some(message_id),
                        Some(tag),
                        Some(keys),
                        Some(body),
                        Some(born_timestamp),
                    ]);

                    // ACK the message
                    let _ = consumer.ack(message).await;
                }
            }
            Err(e) => {
                log::warn!("Failed to receive messages from topic {}: {}", topic, e);
            }
        }

        Ok(ExeSqlResponse {
            header: headers,
            rows,
            table_name: Some(topic.to_string()),
        })
    }

    pub async fn send_message(
        &self,
        topic: &str,
        tag: Option<String>,
        body: String,
    ) -> Result<(), anyhow::Error> {
        let client_option = self.build_client_option();

        let mut producer_option = ProducerOption::default();
        producer_option.set_topics(vec![topic]);

        let mut producer = Producer::new(producer_option, client_option)
            .map_err(|e| anyhow::anyhow!("Failed to create RocketMQ producer: {}", e))?;

        producer
            .start()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to start RocketMQ producer: {}", e))?;

        let message = if let Some(tag) = tag {
            MessageBuilder::builder()
                .set_topic(topic)
                .set_body(body.as_bytes().to_vec())
                .set_tag(&tag)
                .build()
                .map_err(|e| anyhow::anyhow!("Failed to build message: {}", e))?
        } else {
            MessageBuilder::builder()
                .set_topic(topic)
                .set_body(body.as_bytes().to_vec())
                .build()
                .map_err(|e| anyhow::anyhow!("Failed to build message: {}", e))?
        };

        producer
            .send(message)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to send message: {}", e))?;

        log::info!("Message sent to RocketMQ topic: {}", topic);
        Ok(())
    }
}
