import { useState } from "react";
import { FiSend } from "react-icons/fi";
import { sendMessage } from "../../services/kafka";
import { parseBaseResponse } from "../../utils/backendResponse";
import { getErrorMessage } from "../../utils/error";
import { showError, showSuccess } from "../../utils/showToast";
import ActionButton from "../ui/ActionButton";
import FormField from "../ui/FormField";
import Modal from "../ui/Modal";
import type { MessagePanelConfig } from "./messageConfigs";

export interface ProduceMessageDialogProps {
  open: boolean;
  topicName: string;
  connectionId: number;
  config: MessagePanelConfig;
  onClose: () => void;
  /** 发送成功后刷新列表（原 handleSendMessage 内的 fetchMessages） */
  onSent: () => Promise<void>;
}

/**
 * 发送消息弹窗：字段 id（message-meta / message-value）、校验与提示文案
 * 与拆分前保持一致，发送命令由 config.metaField 经 services/kafka 统一分发。
 */
function ProduceMessageDialog({
  open,
  topicName,
  connectionId,
  config,
  onClose,
  onSent,
}: ProduceMessageDialogProps) {
  const [newMeta, setNewMeta] = useState("");
  const [newMessageValue, setNewMessageValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleCloseProducer = () => {
    setNewMeta("");
    setNewMessageValue("");
    onClose();
  };

  const handleSendMessage = async () => {
    if (!newMessageValue.trim()) {
      showError("消息内容不能为空");
      return;
    }

    setSending(true);
    try {
      const responseJson = await sendMessage({
        connectionId,
        topic: topicName,
        metaField: config.metaField,
        meta: newMeta || null,
        value: newMessageValue,
      });

      const { response_code, response_msg } =
        parseBaseResponse<null>(responseJson);

      if (response_code === 0) {
        showSuccess("消息发送成功!");
        handleCloseProducer();
        await onSent();
      } else {
        showError(`发送消息失败: ${response_msg}`);
      }
    } catch (err) {
      showError(`发送消息时发生错误: ${getErrorMessage(err)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`发送消息到 ${topicName}`}
      maxWidthClassName="max-w-lg"
      onClose={handleCloseProducer}
      footer={
        <>
          <ActionButton onClick={handleCloseProducer} disabled={sending}>
            取消
          </ActionButton>
          <ActionButton
            variant="primary"
            icon={<FiSend aria-hidden="true" />}
            loading={sending}
            disabled={!newMessageValue.trim()}
            onClick={() => void handleSendMessage()}
          >
            发送
          </ActionButton>
        </>
      }
    >
      <FormField label={`${config.metaLabel}（可选）`} htmlFor="message-meta">
        <input
          id="message-meta"
          name="message-meta"
          type="text"
          className="input h-8 w-full text-xs"
          value={newMeta}
          onChange={(event) => setNewMeta(event.target.value)}
          placeholder={config.metaPlaceholder}
        />
      </FormField>
      <FormField
        label="消息内容"
        htmlFor="message-value"
        required
        help="JSON 会以格式化形式展示；纯文本原样显示。"
      >
        <textarea
          id="message-value"
          name="message-value"
          className="textarea h-32 w-full font-mono text-xs"
          value={newMessageValue}
          onChange={(event) => setNewMessageValue(event.target.value)}
          placeholder='{"event": "user_login", "userId": "123"}'
          required
        />
      </FormField>
    </Modal>
  );
}

export default ProduceMessageDialog;
