import { invoke } from "@tauri-apps/api/core";

/**
 * 后端命令名集中登记，与 `src-tauri/src/service/cmd.rs` 的 `#[tauri::command]` 一一对应。
 * 组件里禁止再写命令名字符串字面量，统一从这里取，避免改名时漏改。
 */
export const BACKEND_COMMANDS = {
  // 连接管理
  testUrl: "test_url",
  saveBaseConfig: "save_base_config",
  updateBaseConfig: "update_base_config",
  deleteBaseConfig: "delete_base_config",
  getBaseConfig: "get_base_config",
  getBaseConfigById: "get_base_config_by_id",

  // 树与节点
  listNodeInfo: "list_node_info",
  getServerVersion: "get_server_version",
  createFolder: "create_folder",
  createCollection: "create_collection",
  createBucket: "create_bucket",
  deleteBucket: "delete_bucket",
  renameObject: "rename_object",
  copyObject: "copy_object",
  downloadFile: "download_file",
  uploadFile: "upload_file",
  uploadFileWithProgress: "upload_file_with_progress",
  uploadFolder: "upload_folder",
  listLocalFolderFiles: "list_local_folder_files",

  // SQL / 数据
  exeSql: "exe_sql",
  showColumns: "show_columns",
  updateRecord: "update_record",
  deleteTableRow: "delete_table_row",
  getDdl: "get_ddl",
  getObjectInfo: "get_object_info",
  getCompleteWords: "get_complete_words",
  getProcedureDetails: "get_procedure_details",
  getColumnInfoForInsertSql: "get_column_info_for_insert_sql",
  removeColumn: "remove_column",
  updateComment: "update_comment",
  moveColumn: "move_column",
  dropTable: "drop_table",
  dropColumn: "drop_column",
  dropIndex: "drop_index",
  truncateTable: "truncate_table",

  // 查询管理
  saveQuery: "save_query",
  getQuery: "get_query",
  renameQuery: "rename_query",
  removeQuery: "remove_query",

  // 导出 / 导入
  dumpDatabase: "dump_database",
  importDatabase: "import_database",
  generateDatabaseDocument: "generate_database_document",
  initDumpData: "init_dump_data",

  // Redis / Kafka / RocketMQ / Elasticsearch
  redisExecuteCommand: "redis_execute_command",
  kafkaCreateTopic: "kafka_create_topic",
  kafkaDeleteTopic: "kafka_delete_topic",
  kafkaProduceMessage: "kafka_produce_message",
  rocketmqSendMessage: "rocketmq_send_message",
  elasticsearchSearch: "elasticsearch_search",
  elasticsearchIndexDetail: "elasticsearch_index_detail",

  // 应用窗口
  getAboutVersion: "get_about_version",
  showMainWindow: "show_main_window",
} as const;

export type BackendCommand =
  (typeof BACKEND_COMMANDS)[keyof typeof BACKEND_COMMANDS];

/**
 * 统一的后端调用入口。
 * 只做命令名约束与类型透传：不吞异常、不改错误语义，`parseBaseResponse` / toast
 * 仍由调用方按既有约定处理。
 */
export const callBackend = <T>(
  command: BackendCommand,
  args?: Record<string, unknown>,
): Promise<T> => invoke<T>(command, args);
