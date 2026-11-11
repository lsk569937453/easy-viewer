import type { ReactNode } from "react";
import { DiMysql } from "react-icons/di";
import {
  FaChevronRight,
  FaCircle,
  FaCloud,
  FaColumns,
  FaDatabase,
  FaEye,
  FaFileAlt,
  FaFolder,
  FaKey,
  FaLayerGroup,
  FaSearch,
  FaStar,
  FaStream,
  FaTable,
  FaTerminal,
} from "react-icons/fa";
import { SiMongodb, SiOracle, SiRedis, SiSqlite } from "react-icons/si";

/**
 * 图标体系：连接级的品牌图标保留官方色（帮助快速识别数据源），
 * 结构级图标一律单色（currentColor），交给行内文字色控制，
 * 这样在 29 个主题下都不会出现"彩色图标糊在深色背景上"的问题。
 */
export const ICON_MAP: Record<string, ReactNode> = {
  // ===== 连接级：保留品牌色 =====
  mysql: <DiMysql size="1.15em" color="#00758F" />,
  oracle: <SiOracle size="1.15em" color="#F80000" />,
  postgresql: <FaDatabase size="1.15em" color="#336791" />,
  sqlite: <SiSqlite size="1.15em" color="#003B57" />,
  mongodb: <SiMongodb size="1.15em" color="#47A248" />,
  redis: <SiRedis size="1.15em" color="#DC382D" />,
  clickhouse: <FaDatabase size="1.15em" color="#FFCC00" />,
  elasticsearch: <FaDatabase size="1.15em" color="#FEC514" />,
  s3: <FaDatabase size="1.15em" color="#FF9900" />,
  kafka: <FaStream size="1.15em" color="#231F20" />,
  rocketmq: <FaStream size="1.15em" color="#D4213D" />,
  webdav: <FaCloud size="1.15em" color="#3B82F6" />,
  bucket: <FaDatabase size="1.15em" color="#FF9900" />,
  redis_console: <FaTerminal size="1.1em" color="#DC382D" />,

  // ===== 结构级：单色，跟随行内文字色 =====
  table: <FaTable />,
  view: <FaEye />,
  query: <FaSearch />,
  tables: <FaColumns />,
  views: <FaEye />,
  singleTable: <FaTable />,
  partitions: <FaLayerGroup />,
  columns: <FaColumns />,
  index: <FaKey />,
  singlePrimaryIndex: <FaStar />,
  singleCommonIndex: <FaKey />,
  column: <FaStream />,
  primary: <FaStar />,
  default: <FaFolder />,
  singleQuery: <FaFileAlt />,
  folder: <FaFolder />,
  textFile: <FaFileAlt />,
  chevron: <FaChevronRight />,
  dot: <FaCircle size="0.5em" />,

  // ===== Kafka =====
  kafka_topics: <FaColumns />,
  kafka_single_topic: <FaStream />,
  kafka_partitions: <FaLayerGroup />,
  kafka_single_partition: <FaLayerGroup />,
  kafka_messages: <FaStream />,
  kafka_consumer_groups: <FaDatabase />,
  kafka_single_consumer_group: <FaDatabase />,
  kafka_brokers: <FaDatabase />,
  kafka_single_broker: <FaDatabase />,
  kafka_config: <FaKey />,

  // ===== RocketMQ =====
  rocketmq_topics: <FaColumns />,
  rocketmq_single_topic: <FaStream />,
  rocketmq_messages: <FaStream />,

  // ===== Redis =====
  redis_keys: <FaColumns />,
  strings: <FaStream />,
  hashes: <FaLayerGroup />,
  lists: <FaColumns />,
  sets: <FaStar />,
  zsets: <FaKey />,

  // ===== Elasticsearch =====
  es_indices: <FaColumns />,
  es_aliases: <FaEye />,
  es_templates: <FaLayerGroup />,
  es_nodes: <FaDatabase />,
  es_single_alias: <FaEye />,
  es_single_template: <FaLayerGroup />,
  es_single_node: <FaDatabase />,
};

export const getNodeIcon = (
  nodeType?: string | null,
  iconName?: string | null,
): ReactNode => {
  const key = iconName?.toString() || nodeType?.toString() || "default";
  return ICON_MAP[key] || ICON_MAP.default;
};
