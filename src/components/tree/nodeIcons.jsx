import React from "react";
import { DiMysql } from "react-icons/di";
import { SiOracle, SiSqlite, SiMongodb, SiRedis } from "react-icons/si";
import {
  FaTable,
  FaEye,
  FaFolder,
  FaDatabase,
  FaLayerGroup,
  FaKey,
  FaSearch,
  FaColumns,
  FaStream,
  FaStar,
  FaTerminal,
  FaCloud,
} from "react-icons/fa";

export const ICON_MAP = {
  mysql: <DiMysql size="1.2em" color="#00758F" />,
  oracle: <SiOracle size="1.2em" color="#F80000" />,
  postgresql: <FaDatabase size="1.2em" color="#336791" />,
  sqlite: <SiSqlite size="1.2em" color="#003B57" />,
  mongodb: <SiMongodb size="1.2em" color="#47A248" />,
  redis: <SiRedis size="1.2em" color="#DC382D" />,
  clickhouse: <FaDatabase size="1.2em" color="#FFCC00" />,
  elasticsearch: <FaDatabase size="1.2em" color="#FEC514" />,
  s3: <FaDatabase size="1.2em" color="#FF9900" />,
  kafka: <FaStream size="1.2em" color="#231F20" />,
  rocketmq: <FaStream size="1.2em" color="#D4213D" />,
  webdav: <FaCloud size="1.2em" color="#3B82F6" />,
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
  singleQuery: <FaDatabase />,
  // Kafka specific icons
  kafka_topics: <FaColumns color="#00A0E4" />,
  kafka_single_topic: <FaStream color="#00A0E4" />,
  kafka_partitions: <FaLayerGroup color="#7B68EE" />,
  kafka_single_partition: <FaLayerGroup color="#9370DB" />,
  kafka_messages: <FaStream color="#FF6B6B" />,
  kafka_consumer_groups: <FaDatabase color="#50C878" />,
  kafka_single_consumer_group: <FaDatabase color="#3CB371" />,
  kafka_brokers: <FaDatabase color="#FFB347" />,
  kafka_single_broker: <FaDatabase color="#FFA500" />,
  kafka_config: <FaKey color="#DDA0DD" />,
  // RocketMQ specific icons
  rocketmq_topics: <FaColumns color="#D4213D" />,
  rocketmq_single_topic: <FaStream color="#D4213D" />,
  rocketmq_messages: <FaStream color="#FF6B6B" />,
  // Redis specific icons
  redis_keys: <FaColumns color="#DC382D" />,
  strings: <FaStream color="#FF6B6B" />,
  hashes: <FaLayerGroup color="#7B68EE" />,
  lists: <FaColumns color="#50C878" />,
  sets: <FaStar color="#FFB347" />,
  zsets: <FaKey color="#DDA0DD" />,
  redis_console: <FaTerminal color="#DC382D" />,
  // Elasticsearch specific icons
  es_indices: <FaColumns color="#FEC514" />,
  es_aliases: <FaEye color="#FEC514" />,
  es_templates: <FaLayerGroup color="#FEC514" />,
  es_nodes: <FaDatabase color="#FEC514" />,
  es_single_alias: <FaEye color="#FEC514" />,
  es_single_template: <FaLayerGroup color="#FEC514" />,
  es_single_node: <FaDatabase color="#FEC514" />,
  // S3 / OSS specific icons
  bucket: <FaDatabase size="1.2em" color="#FF9900" />,
  folder: <FaFolder color="#FFB347" />,
  textFile: <FaEye color="#87CEEB" />,
};

export const getNodeIcon = (nodeType, iconName) => {
  const key = iconName?.toString() || nodeType?.toString() || "default";
  return ICON_MAP[key] || ICON_MAP.default;
};
