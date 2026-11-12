//! KV / 文档 / 消息队列 / 搜索引擎类数据源的 `Driver` 实现。

use crate::delegate;
use crate::delegate_app;
use crate::driver::traits::{describe_or_default, BoxFuture, Driver};
use crate::error::{AppError, AppResult};
use crate::generated::DatabaseType;
use crate::service::elasticsearch_service::ElasticsearchConfig;
use crate::service::kafka_service::{KafkaConfig, KafkaService};
use crate::service::mongdb_service::MongodbConfig;
use crate::service::redis_service::RedisConfig;
use crate::service::rocketmq_service::{RocketmqConfig, RocketmqService};
use crate::sql_lite::connection::AppState;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::redis_command_response::RedisCommandResponse;

impl Driver for RedisConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Redis
    }

    fn description(&self) -> String {
        describe_or_default(
            RedisConfig::get_description(self),
            DatabaseType::Redis.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(RedisConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(RedisConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, RedisConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, RedisConfig::exe_sql(self, req, &app, sql))
    }

    fn redis_execute(&self, command: String) -> BoxFuture<'_, AppResult<RedisCommandResponse>> {
        // 底层 `execute_raw_command` 是同步 API，这里直接装箱，不经过 `delegate!`。
        let result = crate::service::redis_service::execute_command_text(self, &command);
        Box::pin(async move { result.map_err(AppError::from) })
    }
}

impl Driver for MongodbConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Mongodb
    }

    fn description(&self) -> String {
        describe_or_default(
            MongodbConfig::get_description(self),
            DatabaseType::Mongodb.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(MongodbConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(MongodbConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, MongodbConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, MongodbConfig::exe_sql(self, req, &app, sql))
    }

    fn update_record(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sqls: Vec<String>,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, MongodbConfig::update_record(self, req, &app, sqls))
    }

    fn delete_table_row(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        table_name: String,
        row_id: String,
        _id_column: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            MongodbConfig::delete_table_row(self, req, &app, table_name, row_id)
        )
    }

    fn create_collection(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        collection_name: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            MongodbConfig::create_collection(self, req, &app, collection_name)
        )
    }
}

impl Driver for ElasticsearchConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Elasticsearch
    }

    fn description(&self) -> String {
        describe_or_default(
            ElasticsearchConfig::get_description(self),
            DatabaseType::Elasticsearch.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(ElasticsearchConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(ElasticsearchConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, ElasticsearchConfig::list_node_info(self, req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate_app!(app, ElasticsearchConfig::exe_sql(self, req, &app, sql))
    }

    fn search_documents(
        &self,
        index_name: String,
        query: Option<String>,
        search_query: Option<String>,
        from: i64,
        size: i64,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        delegate!(ElasticsearchConfig::search_documents(
            self,
            index_name,
            query,
            search_query,
            from,
            size
        ))
    }

    fn index_detail(
        &self,
        index_name: String,
    ) -> BoxFuture<'_, AppResult<serde_json::Value>> {
        delegate!(ElasticsearchConfig::get_index_detail(self, index_name))
    }
}

impl Driver for KafkaConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Kafka
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        let service = KafkaService::new(self.clone());
        Box::pin(async move {
            service
                .test_connection()
                .await
                .map(|()| String::new())
                .map_err(AppError::from)
        })
    }
    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(KafkaService::new(self.clone()).test_connection())
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        let service = KafkaService::new(self.clone());
        delegate_app!(app, service.list_node_info(req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        let service = KafkaService::new(self.clone());
        delegate_app!(app, service.exe_sql(req, &app, sql))
    }

    fn kafka_create_topic(
        &self,
        topic: String,
        num_partitions: i32,
        replication_factor: i32,
    ) -> BoxFuture<'_, AppResult<()>> {
        let service = KafkaService::new(self.clone());
        Box::pin(async move {
            service
                .create_topic(&topic, num_partitions, replication_factor)
                .await
                .map_err(crate::error::AppError::from)
        })
    }

    fn kafka_delete_topic(&self, topic: String) -> BoxFuture<'_, AppResult<()>> {
        let service = KafkaService::new(self.clone());
        delegate!(service.delete_topic(&topic))
    }

    fn kafka_produce_message(
        &self,
        topic: String,
        key: Option<String>,
        value: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        let service = KafkaService::new(self.clone());
        delegate!(service.produce_message(&topic, key, value))
    }
}

impl Driver for RocketmqConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Rocketmq
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        let service = RocketmqService::new(self.clone());
        Box::pin(async move {
            service
                .test_connection()
                .await
                .map(|()| String::new())
                .map_err(AppError::from)
        })
    }
    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(RocketmqService::new(self.clone()).test_connection())
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        let service = RocketmqService::new(self.clone());
        delegate_app!(app, service.list_node_info(req, &app))
    }

    fn execute_sql(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        sql: String,
    ) -> BoxFuture<'_, AppResult<ExeSqlResponse>> {
        let service = RocketmqService::new(self.clone());
        delegate_app!(app, service.exe_sql(req, &app, sql))
    }

    fn rocketmq_send_message(
        &self,
        topic: String,
        tag: Option<String>,
        value: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        let service = RocketmqService::new(self.clone());
        delegate!(service.send_message(&topic, tag, value))
    }
}
