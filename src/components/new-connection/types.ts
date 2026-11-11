import type { ConnectionDraft } from "../../utils/connectionForm";

/** 字段组子组件公共 props：受控 draft + 错误文案 + 合并更新。 */
export interface ConnectionFieldProps {
  draft: ConnectionDraft;
  error: string;
  onChange: (patch: Partial<ConnectionDraft>) => void;
}
