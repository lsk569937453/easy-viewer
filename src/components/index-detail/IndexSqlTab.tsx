import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import useIsDarkTheme from "../../utils/useIsDarkTheme";

export interface IndexSqlTabProps {
  createIndexSql: string;
}

/** 创建 SQL 页签：语法高亮，空值时展示占位注释。 */
function IndexSqlTab({ createIndexSql }: IndexSqlTabProps) {
  const isDarkTheme = useIsDarkTheme();

  return (
    <SyntaxHighlighter
      language="sql"
      style={isDarkTheme ? vscDarkPlus : vs}
      customStyle={{
        margin: 0,
        minHeight: "100%",
        fontSize: 12,
        background: "transparent",
      }}
    >
      {createIndexSql || "-- 无法生成创建索引的 SQL"}
    </SyntaxHighlighter>
  );
}

export default IndexSqlTab;
