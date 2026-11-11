import { type FormEvent, useRef } from "react";
import ConnectionAlerts from "./new-connection/ConnectionAlerts";
import ConnectionBasicsFields from "./new-connection/ConnectionBasicsFields";
import HostFields from "./new-connection/HostFields";
import KafkaFields from "./new-connection/KafkaFields";
import ModalActions from "./new-connection/ModalActions";
import RocketmqFields from "./new-connection/RocketmqFields";
import S3Fields from "./new-connection/S3Fields";
import UrlFields from "./new-connection/UrlFields";
import { useConnectionForm } from "./new-connection/useConnectionForm";
import { useConnectionSubmit } from "./new-connection/useConnectionSubmit";
import { useConnectionTest } from "./new-connection/useConnectionTest";
import WebdavFields from "./new-connection/WebdavFields";
import ConfirmDialog from "./ui/ConfirmDialog";

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (affectedId: number | null, isEditMode: boolean) => void;
  editingId?: number | null;
}

/**
 * 新建/编辑数据库连接弹窗。
 * 表单状态、测试、提交分别由 new-connection/ 下的三个 hook 承担；
 * 这里只负责弹窗外壳、字段组编排与底部操作区。
 */
function NewConnectionModal({
  isOpen,
  onClose,
  onSaveSuccess,
  editingId,
}: NewConnectionModalProps) {
  const createFormRef = useRef<HTMLFormElement>(null);
  const isEditMode = !!editingId;
  const test = useConnectionTest();
  const submit = useConnectionSubmit({
    isEditMode,
    editingId,
    onSaveSuccess,
    onClose,
  });
  const form = useConnectionForm({
    isOpen,
    editingId,
    resetTransientState: () => {
      test.resetTestState();
      submit.resetSubmitState();
    },
    resetTestResult: test.resetTestResult,
  });

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void submit.handleCreate(event, {
      draft: form.draft,
      testResult: test.testResult,
      setError: form.setError,
      setTestResult: test.setTestResult,
      requestWeakSaveConfirm: () => test.setConfirmWeakSave(true),
    });
  };

  const handleTestConnection = () => {
    void test.handleTestConnection(form.draft, form.setError);
  };

  const { draft, error } = form;
  // 字段组子组件共用同一组受控 props，避免逐处重复 draft/error/onChange
  const fieldProps = { draft, error, onChange: form.updateDraft };

  return (
    <dialog id="new_connection_modal" className="modal" open={isOpen}>
      <div className="modal-box max-w-lg bg-base-100 shadow-xl rounded-lg p-6">
        <h2
          id="new-connection-title"
          className="font-bold text-2xl text-primary mb-4 border-b border-base-content/20 pb-2"
        >
          {isEditMode ? "编辑数据库连接" : "新建数据库连接"}
        </h2>

        <form ref={createFormRef} onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            <ConnectionBasicsFields
              {...fieldProps}
              isEditMode={isEditMode}
              canUseHostMode={form.canUseHostMode}
              onDbTypeChange={form.handleDbTypeChange}
            />

            {draft.connectionMode === "url" && (
              <UrlFields
                {...fieldProps}
                onSelectSqliteFile={form.handleSelectSqliteFile}
              />
            )}

            {draft.connectionMode === "host" && <HostFields {...fieldProps} />}

            {form.isKafkaType && <KafkaFields {...fieldProps} />}

            {form.isRocketmqType && <RocketmqFields {...fieldProps} />}

            {form.isS3Type && <S3Fields {...fieldProps} />}

            {form.isWebdavType && <WebdavFields {...fieldProps} />}

            <ConnectionAlerts
              error={error}
              testResult={test.testResult}
              testMessage={test.testMessage}
            />
          </div>

          <ModalActions
            isEditMode={isEditMode}
            isTesting={test.isTesting}
            isCreating={submit.isCreating}
            onTestConnection={handleTestConnection}
            onClose={onClose}
          />
        </form>

        <ConfirmDialog
          open={test.confirmWeakSave}
          title="连接测试未通过"
          description="测试失败通常意味着配置有误，确定仍要保存这个连接吗？保存后可以再回来修改。"
          confirmText="仍要保存"
          cancelText="返回修改"
          tone="primary"
          onConfirm={() => {
            test.setConfirmWeakSave(false);
            // requestSubmit 重新触发 onSubmit；此时 testResult 已重置，不会二次拦截
            createFormRef.current?.requestSubmit();
          }}
          onCancel={() => test.setConfirmWeakSave(false)}
        />
      </div>
    </dialog>
  );
}

export default NewConnectionModal;
