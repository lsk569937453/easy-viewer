import FormField from "../ui/FormField";

export interface QueryDslEditorProps {
  queryText: string;
  onChange: (value: string) => void;
  onRun: () => void;
}

/** 自定义 Query DSL 编辑器（Ctrl/Cmd + Enter 执行）。 */
function QueryDslEditor({ queryText, onChange, onRun }: QueryDslEditorProps) {
  return (
    <div className="flex-shrink-0 border-b border-hairline">
      <FormField
        className="px-3 py-2"
        label="Elasticsearch Query DSL（仅需填写 query 部分）"
        htmlFor="es-query-dsl"
        help="Ctrl + Enter 执行；支持 term、match、bool、range 等任意 query DSL。"
      >
        <textarea
          id="es-query-dsl"
          aria-label="Elasticsearch Query DSL"
          className="textarea h-32 w-full resize-y rounded-[var(--radius-control)] border-hairline bg-base-100 font-mono text-xs leading-relaxed"
          rows={6}
          value={queryText}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              onRun();
            }
          }}
          spellCheck={false}
          placeholder='{"match_all": {}}'
        />
      </FormField>
    </div>
  );
}

export default QueryDslEditor;
