import { invoke } from "@tauri-apps/api/core";

/**
 * 后端命令名集中登记，与 `src-tauri/src/main.rs` 的 `generate_handler!` 一一对应。
 *
 * 约定：组件与 hook 里禁止再写命令名字符串字面量，统一从这里取，
 * 避免「后端加了命令、前端漏登记」这类静默失配。
 */
export const BACKEND_COMMANDS = {
  // 连接管理
  testUrl: "test_url",
  saveBaseConfig: "save_base_config",
  updateBaseConfig: "update_base_config",
  deleteBaseConfig: "delete_base_config",
  getBaseConfig: "get_base_config",
  getBaseConfigById: "get_base_config_by_id",

  // 元数据（由 YAML 描述符生成）
  getDatabaseTypes: "get_database_types",
  getDdlTemplate: "get_ddl_template",

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
  downloadBucket: "download_bucket",
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

/** 超过该耗时就在控制台留一条 warn，便于定位慢调用。 */
const SLOW_CALL_MS = 300;

/**
 * 统一的后端调用出口。
 *
 * 只做三件事：命令名约束、耗时观测、错误原样透传。
 * **不吞异常、不改错误语义** —— `parseBaseResponse` / toast 仍由调用方按既有约定处理，
 * 这样错误信封（`code` / `message` / `detail`）在上层仍然拿得到。
 */
export const forward = <T>(
  command: BackendCommand,
  args?: Record<string, unknown>,
): Promise<T> => {
  const startedAt = performance.now();
  return invoke<T>(command, args).then(
    (result) => {
      reportTiming(command, startedAt, true);
      return result;
    },
    (error: unknown) => {
      reportTiming(command, startedAt, false);
      throw error;
    },
  );
};

function reportTiming(
  command: BackendCommand,
  startedAt: number,
  succeeded: boolean,
): void {
  const elapsed = performance.now() - startedAt;
  if (import.meta.env.DEV) {
    console.debug(
      `[backend] ${command} ${succeeded ? "ok" : "fail"} ${elapsed.toFixed(1)}ms`,
    );
  }
  if (elapsed > SLOW_CALL_MS) {
    console.warn(`[backend] ${command} 耗时 ${elapsed.toFixed(0)}ms`);
  }
}

/** 兼容旧调用点的别名。 */
export const callBackend = forward;
