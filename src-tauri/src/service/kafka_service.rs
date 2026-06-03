use crate::vojo::exe_sql_response::{ExeSqlResponse, Header};
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::{ListNodeInfoResponse, ListNodeInfoResponseItem};
use crate::AppState;
use rdkafka::admin::{AdminClient, AdminOptions, NewTopic, TopicReplication};
use rdkafka::client::ClientContext;
use rdkafka::config::{ClientConfig, RDKafkaLogLevel};
use rdkafka::consumer::{StreamConsumer, DefaultConsumerContext, Consumer};
use rdkafka::message::Message;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use futures_util::StreamExt;

#[derive(Clone, Deserialize, Serialize, Debug)]
pub struct KafkaConfig {
    pub broker: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security_protocol: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sasl_mechanism: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sasl_username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sasl_password: Option<String>,
}

// 自定义 Context 用于处理日志
struct CustomContext;

impl ClientContext for CustomContext {}

pub type KafkaAdminClient = AdminClient<CustomContext>;
pub type KafkaStreamConsumer = StreamConsumer<DefaultConsumerContext>;
pub type KafkaFutureProducer = FutureProducer<CustomContext>;

pub struct KafkaService {
    config: KafkaConfig,
}

impl KafkaService {
    pub fn new(config: KafkaConfig) -> Self {
        Self { config }
    }

    fn build_client_config(&self) -> ClientConfig {
        let mut client_config = ClientConfig::new();

        // 设置 bootstrap servers
        client_config.set("bootstrap.servers", &self.config.broker);
        client_config.set("session.timeout.ms", "6000");
        client_config.set("auto.offset.reset", "earliest");

        // 如果有 SASL 配置
        if let (Some(mechanism), Some(username), Some(password)) = (
            &self.config.sasl_mechanism,
            &self.config.sasl_username,
            &self.config.sasl_password,
        ) {
            client_config.set("sasl.mechanism", mechanism);
            client_config.set("sasl.username", username);
            client_config.set("sasl.password", password);

            if let Some(protocol) = &self.config.security_protocol {
                client_config.set("security.protocol", protocol);
            }
        }

        // 设置日志级别
        client_config.set_log_level(RDKafkaLogLevel::Info);

        client_config
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let client_config = self.build_client_config();

        // 创建 AdminClient 来测试连接
        let admin: KafkaAdminClient = client_config
            .create_with_context(CustomContext)
            .map_err(|e| anyhow::anyhow!("Failed to create Kafka admin client: {}", e))?;

        // 获取 metadata 来验证连接
        let timeout = Timeout::After(Duration::from_secs(5));
        let _metadata = admin
            .inner()
            .fetch_metadata(None, timeout)
            .map_err(|e| anyhow::anyhow!("Failed to fetch Kafka metadata: {}", e))?;

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
                // Root level - 显示主要资源类型
                let topics = self.list_topics().await?;
                vec.push(ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "kafka_topics".to_string(),
                    "Topics".to_string(),
                    Some(format!("({})", topics.len())),
                ));
                vec.push(ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "kafka_consumer_groups".to_string(),
                    "Consumer Groups".to_string(),
                    None,
                ));
                vec.push(ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "kafka_brokers".to_string(),
                    "Brokers".to_string(),
                    None,
                ));
            }
            2 => {
                let node_type = level_infos[1].config_value.as_str();

                match node_type {
                    "Topics" => {
                        // 列出所有 topics
                        let topics = self.list_topics().await?;
                        for topic in topics {
                            vec.push(ListNodeInfoResponseItem::new(
                                true,
                                true,
                                "kafka_single_topic".to_string(),
                                topic.clone(),
                                None,
                            ));
                        }
                    }
                    "Consumer Groups" => {
                        // 列出消费者组 - 返回空列表，暂时不支持
                        vec.push(ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "kafka_single_consumer_group".to_string(),
                            "Not supported".to_string(),
                            None,
                        ));
                    }
                    "Brokers" => {
                        // 列出 broker 信息
                        let broker_info = self.config.broker.clone();
                        vec.push(ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "kafka_single_broker".to_string(),
                            broker_info,
                            None,
                        ));
                    }
                    _ => {}
                }
            }
            3 => {
                let node_type = level_infos[1].config_value.as_str();
                let _topic_name = level_infos[2].config_value.as_str();

                if node_type == "Topics" {
                    // 显示 topic 的子节点
                    vec.push(ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "kafka_partitions".to_string(),
                        "Partitions".to_string(),
                        None,
                    ));
                    vec.push(ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "kafka_messages".to_string(),
                        "Messages".to_string(),
                        Some("View messages".to_string()),
                    ));
                    vec.push(ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "kafka_config".to_string(),
                        "Configuration".to_string(),
                        None,
                    ));
                }
            }
            4 => {
                // Topic 下的子项
                let node_type = level_infos[2].config_value.as_str();

                if node_type == "Partitions" {
                    let topic_name = level_infos[2].config_value.as_str();
                    // 显示分区信息
                    let partitions = self.get_topic_partitions(topic_name).await?;
                    for (idx, leader) in partitions {
                        vec.push(ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "kafka_single_partition".to_string(),
                            format!("Partition {}", idx),
                            Some(format!("Leader: {}", leader)),
                        ));
                    }
                }
            }
            _ => {}
        }

        Ok(ListNodeInfoResponse::new(vec))
    }

    async fn list_topics(&self) -> Result<Vec<String>, anyhow::Error> {
        let client_config = self.build_client_config();
        let admin: KafkaAdminClient = client_config
            .create_with_context(CustomContext)
            .map_err(|e| anyhow::anyhow!("Failed to create Kafka admin client: {}", e))?;

        let timeout = Timeout::After(Duration::from_secs(5));
        let metadata = admin
            .inner()
            .fetch_metadata(None, timeout)
            .map_err(|e| anyhow::anyhow!("Failed to fetch metadata: {}", e))?;

        let topics: Vec<String> = metadata
            .topics()
            .iter()
            .filter(|t| t.name() != "__consumer_offsets")
            .map(|t| t.name().to_string())
            .collect();

        Ok(topics)
    }

    async fn list_consumer_groups(&self) -> Result<Vec<String>, anyhow::Error> {
        // 暂时返回空列表，消费者组查询需要不同的实现
        Ok(vec![])
    }

    async fn get_topic_partitions(&self, topic: &str) -> Result<Vec<(i32, i32)>, anyhow::Error> {
        let client_config = self.build_client_config();
        let admin: KafkaAdminClient = client_config
            .create_with_context(CustomContext)
            .map_err(|e| anyhow::anyhow!("Failed to create Kafka admin client: {}", e))?;

        let timeout = Timeout::After(Duration::from_secs(5));
        let metadata = admin
            .inner()
            .fetch_metadata(Some(topic), timeout)
            .map_err(|e| anyhow::anyhow!("Failed to fetch metadata: {}", e))?;

        if let Some(topic_metadata) = metadata.topics().iter().find(|t| t.name() == topic) {
            let partitions: Vec<(i32, i32)> = topic_metadata
                .partitions()
                .iter()
                .map(|p| (p.id(), p.leader()))
                .collect();
            Ok(partitions)
        } else {
            Ok(vec![])
        }
    }

    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        _sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        // 对于 Kafka，这个方法用于消费消息
        // 从 path 中获取 topic 和分区信息
        let level_infos = list_node_info_req.level_infos;

        if level_infos.len() < 3 {
            return Ok(ExeSqlResponse::new());
        }

        let topic = &level_infos[2].config_value;
        let limit = 100; // 默认获取 100 条消息

        let messages = self.consume_messages(topic, limit).await?;

        Ok(messages)
    }

    async fn consume_messages(
        &self,
        topic: &str,
        limit: usize,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let mut client_config = self.build_client_config();
        client_config.set("group.id", &format!("easy_viewer_consumer_{}", chrono::Utc::now().timestamp()));
        client_config.set("enable.auto.commit", "false");

        let consumer: KafkaStreamConsumer = client_config
            .create()
            .map_err(|e| anyhow::anyhow!("Failed to create consumer: {}", e))?;

        // 订阅 topic
        consumer
            .subscribe(&[topic])
            .map_err(|e| anyhow::anyhow!("Failed to subscribe to topic: {}", e))?;

        let headers = vec![
            Header {
                name: "Partition".to_string(),
                type_name: "i32".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Offset".to_string(),
                type_name: "i64".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Key".to_string(),
                type_name: "string".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Value".to_string(),
                type_name: "string".to_string(),
                is_primary_key: false,
            },
            Header {
                name: "Timestamp".to_string(),
                type_name: "datetime".to_string(),
                is_primary_key: false,
            },
        ];

        let mut rows = vec![];
        let mut consumed = 0;

        // 使用 stream 获取消息
        let start_time = std::time::Instant::now();
        let timeout = Duration::from_secs(3);

        let mut stream = consumer.stream();
        while consumed < limit && start_time.elapsed() < timeout {
            match tokio::time::timeout(Duration::from_millis(500), stream.next()).await {
                Ok(Some(Ok(msg))) => {
                    let partition = msg.partition();
                    let offset = msg.offset();
                    let key = msg.key().map(|k| String::from_utf8_lossy(k).to_string());
                    let payload = msg
                        .payload()
                        .map(|p| String::from_utf8_lossy(p).to_string());
                    let timestamp = format!("{:?}", msg.timestamp());

                    rows.push(vec![
                        Some(partition.to_string()),
                        Some(offset.to_string()),
                        key.unwrap_or_else(|| "NULL".to_string()).into(),
                        payload.unwrap_or_else(|| "NULL".to_string()).into(),
                        Some(timestamp),
                    ]);

                    consumed += 1;
                }
                Ok(Some(Err(e))) => {
                    log::error!("Kafka consumer error: {}", e);
                    break;
                }
                Ok(None) | Err(_) => {
                    // 超时或流结束
                    break;
                }
            }
        }

        Ok(ExeSqlResponse {
            header: headers,
            rows,
            table_name: Some(topic.to_string()),
        })
    }

    pub async fn produce_message(
        &self,
        topic: &str,
        key: Option<String>,
        value: String,
    ) -> Result<(), anyhow::Error> {
        let client_config = self.build_client_config();
        let producer: KafkaFutureProducer = client_config
            .create_with_context(CustomContext)
            .map_err(|e| anyhow::anyhow!("Failed to create producer: {}", e))?;

        let record = FutureRecord::to(topic)
            .payload(&value)
            .key(key.as_deref().unwrap_or(""));

        // 等待发送完成
        let _delivery = match tokio::time::timeout(Duration::from_secs(5), producer.send(record, Duration::from_secs(5))).await {
            Ok(Ok(delivery)) => delivery,
            Ok(Err((e, _))) => return Err(anyhow::anyhow!("Failed to send message: {}", e)),
            Err(_) => return Err(anyhow::anyhow!("Timeout sending message")),
        };

        log::info!("Message sent to topic: {}", topic);
        Ok(())
    }

    pub async fn create_topic(
        &self,
        topic: &str,
        num_partitions: i32,
        replication_factor: i32,
    ) -> Result<(), anyhow::Error> {
        let client_config = self.build_client_config();
        let admin: KafkaAdminClient = client_config
            .create_with_context(CustomContext)
            .map_err(|e| anyhow::anyhow!("Failed to create admin client: {}", e))?;

        // 使用 TopicReplication::Fixed
        let new_topic = NewTopic::new(topic, num_partitions, TopicReplication::Fixed(replication_factor));

        let opts = AdminOptions::new();

        admin
            .create_topics(&[new_topic], &opts)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create topic: {}", e))?;

        Ok(())
    }

    pub async fn delete_topic(&self, topic: &str) -> Result<(), anyhow::Error> {
        let client_config = self.build_client_config();
        let admin: KafkaAdminClient = client_config
            .create_with_context(CustomContext)
            .map_err(|e| anyhow::anyhow!("Failed to create admin client: {}", e))?;

        let opts = AdminOptions::new();

        admin
            .delete_topics(&[topic], &opts)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to delete topic: {}", e))?;

        Ok(())
    }
}
