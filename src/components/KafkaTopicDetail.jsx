import React, { useState, useEffect } from "react";
import { showSuccess, showError } from "../utils/showToast.jsx";
import { invoke } from "@tauri-apps/api/core";
import {
  IoRefresh,
  IoTrashOutline,
  IoInformationCircle,
  IoLayers,
  IoTime,
  IoServer,
} from "react-icons/io5";

function KafkaTopicDetail({ activeTabNode, connectionDetails }) {
  const [topicInfo, setTopicInfo] = useState(null);
  const [partitions, setPartitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const topicName =
    activeTabNode?.path?.[activeTabNode.path.length - 2]?.config_value ||
    activeTabNode?.name;

  // 获取 Topic 信息
  const fetchTopicInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const listNodeInfoReq = {
        level_infos: activeTabNode.path,
      };

      const responseJson = await invoke("list_node_info", {
        listNodeInfoReq,
      });

      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0 && response_msg) {
        // 提取分区信息
        const partitionNodes = response_msg.list.filter(
          (item) => item.icon_name === "kafka_single_partition"
        );

        setPartitions(
          partitionNodes.map((p) => {
            const match = p.name.match(/Partition (\d+)/);
            return {
              id: match ? parseInt(match[1]) : -1,
              leader: p.description || "Unknown",
            };
          })
        );

        setTopicInfo({
          name: topicName,
          partitionCount: partitionNodes.length,
        });
      }
    } catch (err) {
      setError(`获取 Topic 信息失败: ${err.message || err.toString()}`);
      console.error("Failed to fetch topic info:", err);
    } finally {
      setLoading(false);
    }
  };

  // 删除 Topic
  const handleDeleteTopic = async () => {
    if (
      !window.confirm(
        `确定要删除 Topic "${topicName}" 吗？此操作不可撤销！`
      )
    ) {
      return;
    }

    try {
      const responseJson = await invoke("kafka_delete_topic", {
        connectionId: connectionDetails.base_config_id,
        topic: topicName,
      });

      const { response_code, response_msg } = JSON.parse(responseJson);

      if (response_code === 0) {
        showSuccess(`Topic "${topicName}" 已删除`);
        window.location.reload(); // 简单刷新页面
      } else {
        showError(`删除失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`删除 Topic 时发生错误: ${err.message || err.toString()}`);
    }
  };

  useEffect(() => {
    fetchTopicInfo();
  }, [topicName]);

  if (loading && !topicInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error && !topicInfo) {
    return (
      <div className="alert alert-error m-4">
        <span>{error}</span>
        <button className="btn btn-sm btn-ghost ml-2" onClick={fetchTopicInfo}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 border-b border-base-content/10 px-6 py-4 bg-base-200/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-xl font-bold text-primary">{topicName}</h2>
              <p className="text-sm text-base-content/60">Kafka Topic</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`btn btn-sm btn-outline ${loading ? "loading" : ""}`}
              onClick={fetchTopicInfo}
              disabled={loading}
            >
              <IoRefresh className="mr-1" />
              刷新
            </button>
            <button
              className="btn btn-sm btn-error"
              onClick={handleDeleteTopic}
            >
              <IoTrashOutline className="mr-1" />
              删除 Topic
            </button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mt-4" role="tablist">
          <button
            className={`tab ${
              activeTab === "overview" ? "tab-active" : ""
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <IoInformationCircle className="mr-1" />
            概览
          </button>
          <button
            className={`tab ${
              activeTab === "partitions" ? "tab-active" : ""
            }`}
            onClick={() => setActiveTab("partitions")}
          >
            <IoLayers className="mr-1" />
            分区 ({partitions.length})
          </button>
          <button
            className={`tab ${activeTab === "config" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("config")}
          >
            <IoServer className="mr-1" />
            配置
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="card bg-base-200/50">
              <div className="card-body">
                <h3 className="card-title text-lg">基本信息</h3>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-base-content/60">Topic 名称</p>
                    <p className="font-semibold">{topicName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">分区数</p>
                    <p className="font-semibold">{partitions.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 分区列表预览 */}
            <div className="card bg-base-200/50">
              <div className="card-body">
                <h3 className="card-title text-lg">分区列表</h3>
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>分区 ID</th>
                        <th>Leader</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partitions.map((partition) => (
                        <tr key={partition.id}>
                          <td className="font-mono">Partition {partition.id}</td>
                          <td>{partition.leader}</td>
                          <td>
                            <span className="badge badge-success">在线</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "partitions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">分区详情</h3>
              <span className="badge badge-primary">共 {partitions.length} 个分区</span>
            </div>

            {partitions.length === 0 ? (
              <div className="text-center text-base-content/40 py-12">
                <p>暂无分区信息</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partitions.map((partition) => (
                  <div key={partition.id} className="card bg-base-200/50">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <h4 className="card-title">Partition {partition.id}</h4>
                        <span className="badge badge-success badge-sm">Active</span>
                      </div>
                      <div className="space-y-2 text-sm mt-4">
                        <div className="flex justify-between">
                          <span className="text-base-content/60">Leader:</span>
                          <span className="font-mono">{partition.leader}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/60">Replicas:</span>
                          <span>1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/60">ISR:</span>
                          <span>1</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "config" && (
          <div className="space-y-6">
            <div className="card bg-base-200/50">
              <div className="card-body">
                <h3 className="card-title text-lg">Topic 配置</h3>
                <div className="overflow-x-auto mt-4">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>配置项</th>
                        <th>值</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-mono text-sm">
                          num.partitions
                        </td>
                        <td>{partitions.length}</td>
                        <td>分区数量</td>
                      </tr>
                      <tr>
                        <td className="font-mono text-sm">
                          default.replication.factor
                        </td>
                        <td>1</td>
                        <td>默认副本因子</td>
                      </tr>
                      <tr>
                        <td className="font-mono text-sm">
                          retention.ms
                        </td>
                        <td>604800000 (7 days)</td>
                        <td>消息保留时间</td>
                      </tr>
                      <tr>
                        <td className="font-mono text-sm">
                          retention.bytes
                        </td>
                        <td>-1 (unlimited)</td>
                        <td>消息保留大小</td>
                      </tr>
                      <tr>
                        <td className="font-mono text-sm">
                          cleanup.policy
                        </td>
                        <td>delete</td>
                        <td>清理策略</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KafkaTopicDetail;
