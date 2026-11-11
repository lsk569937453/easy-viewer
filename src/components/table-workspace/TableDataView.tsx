import type { ChangeEvent } from "react";
import { FaPlay, FaPlus, FaSave, FaUndo } from "react-icons/fa";
import ActionButton from "../ui/ActionButton";
import Pagination from "../ui/Pagination";
import SearchBox from "../ui/SearchBox";
import StatusChip from "../ui/StatusChip";
import Toolbar from "../ui/Toolbar";
import TableDataGrid from "./TableDataGrid";
import type { UseEditableRowsResult } from "./useEditableRows";
import type { UseTableDataResult } from "./useTableData";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface TableDataViewProps {
  data: UseTableDataResult;
  rows: UseEditableRowsResult;
  sqlQuery: string;
  onSqlQueryChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onExecute: () => void;
}

/** 「数据」子视图：SQL 输入 + 检索/分页工具条 + 可编辑表格。 */
function TableDataView({
  data,
  rows,
  sqlQuery,
  onSqlQueryChange,
  onExecute,
}: TableDataViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-start gap-2">
        <textarea
          className="textarea h-16 min-h-0 w-full resize-y rounded-[var(--radius-control)] border-hairline bg-base-100 font-mono text-xs leading-relaxed"
          placeholder="在此输入 SQL 查询…"
          aria-label="SQL 查询"
          name="sqlQuery"
          value={sqlQuery}
          onChange={onSqlQueryChange}
        />
        <ActionButton
          variant="primary"
          size="sm"
          className="mt-0.5"
          icon={<FaPlay size="0.8em" aria-hidden="true" />}
          onClick={onExecute}
        >
          执行
        </ActionButton>
      </div>

      <TableDataGrid
        columnHeaders={rows.columnHeaders}
        rows={data.paginatedData}
        isEmpty={data.filteredTableData.length === 0}
        sqlQuery={sqlQuery}
        onCellChange={rows.handleCellChange}
        onCellInput={rows.handleCellInput}
        onRequestDelete={rows.requestDeleteRow}
        toolbar={
          <Toolbar
            className="mb-2 rounded-[var(--radius-control)] border border-hairline"
            left={
              <SearchBox
                value={data.searchTerm}
                onChange={data.setSearchTerm}
                placeholder="检索表内容…"
                ariaLabel="检索表内容"
                className="max-w-xs"
              />
            }
            right={
              <>
                {data.filteredTableData.length > 0 ? (
                  <StatusChip tone="info">单元格可直接编辑</StatusChip>
                ) : null}
                <Pagination
                  page={data.currentPage}
                  totalPages={data.totalPages}
                  total={data.filteredTableData.length}
                  pageSize={data.itemsPerPage}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={data.setCurrentPage}
                  onPageSizeChange={(size) => {
                    data.setItemsPerPage(size);
                    data.setCurrentPage(1); // 改变每页显示数量时重置到第一页
                  }}
                />
                <ActionButton
                  size="sm"
                  variant="ghost"
                  icon={<FaPlus size="0.75em" aria-hidden="true" />}
                  title="新增数据"
                  onClick={() =>
                    rows.handleAddRow(data.itemsPerPage, data.setCurrentPage)
                  }
                >
                  新增
                </ActionButton>
                {rows.hasChanges ? (
                  <>
                    <ActionButton
                      size="sm"
                      icon={<FaUndo size="0.8em" aria-hidden="true" />}
                      onClick={() => {
                        rows.handleCancelChanges();
                        data.setCurrentPage(1);
                      }}
                    >
                      取消
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="primary"
                      icon={<FaSave size="0.8em" aria-hidden="true" />}
                      onClick={() => void rows.handleSaveChanges()}
                    >
                      保存
                    </ActionButton>
                  </>
                ) : null}
              </>
            }
          />
        }
      />
    </div>
  );
}

export default TableDataView;
