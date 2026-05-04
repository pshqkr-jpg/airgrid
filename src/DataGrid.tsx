// airgrid DataGrid — 가상 스크롤 + CSS grid 레이아웃 + 컬럼 필터/정렬/hide.
//
// 호스트 앱이 className 또는 CSS variables 로 스타일 override:
//   --airgrid-bg, --airgrid-header-bg, --airgrid-border,
//   --airgrid-border-subtle, --airgrid-row-hover.

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef as TSColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ColumnDef, AirgridMeta } from "./types";
import { pickFilterFn } from "./filterFns";
import { HeaderCell } from "./HeaderCell";
import { HideColumnsMenu } from "./HideColumnsMenu";

export type DataGridProps<TRow> = {
  data: TRow[];
  columns: ColumnDef<TRow>[];
  /** 행 식별 키. 메모리 안정성과 React key 정확성 위해 필수. */
  rowKey: keyof TRow & string;
  /** 컨테이너 높이. 가상 스크롤이 작동하려면 고정 높이 필요. */
  height?: number | string;
  /** 평균 행 높이 추정값 (px). 실 행 높이가 다르면 자동 보정. */
  estimatedRowHeight?: number;
  /** 컨테이너 className. 호스트 앱 스타일 hook. */
  className?: string;
  /** data 가 비었을 때 렌더할 노드. */
  emptyText?: ReactNode;
  /** 헤더 row 의 추정 높이 (정렬+필터 input 포함, default 60px). */
  headerHeight?: number;
};

export function DataGrid<TRow extends Record<string, unknown>>(
  props: DataGridProps<TRow>,
) {
  const {
    data, columns, rowKey,
    height = 600, estimatedRowHeight = 32, headerHeight = 60,
    className, emptyText,
  } = props;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => Object.fromEntries(
      columns.filter((c) => c.defaultVisible === false).map((c) => [c.id, false]),
    ),
  );

  const tableColumns = useMemo<TSColumnDef<TRow>[]>(
    () => columns.map((c) => {
      const meta: AirgridMeta = {
        align: c.align,
        width: c.width,
        filterType: c.filterType,
        selectOptions: c.selectOptions,
      };
      const def: TSColumnDef<TRow> = {
        id: c.id,
        header: c.header,
        accessorKey: c.accessorKey,
        cell: c.cell ? (info) => c.cell!(info.row.original) : undefined,
        meta,
        enableSorting: c.sortable !== false,
        enableColumnFilter: !!c.filterType,
      };
      const filterFn = pickFilterFn(c.filterType);
      if (filterFn) def.filterFn = filterFn;
      return def;
    }),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => String(row[rowKey]),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
  });

  // 보이는 컬럼만 grid template 에 반영. hide 변경 시 자동 재계산.
  const visibleColumns = table.getVisibleLeafColumns();
  const gridTemplateColumns = useMemo(
    () => visibleColumns
      .map((c) => (c.columnDef.meta as AirgridMeta | undefined)?.width ?? "minmax(80px, 1fr)")
      .join(" "),
    [visibleColumns],
  );

  return (
    <div className={className}>
      {/* 우측 상단 컨트롤 바 — hide menu, filtered count */}
      <div style={controlsBarStyle}>
        <span style={{ fontSize: 11, color: "var(--airgrid-header-fg, #6b7280)" }}>
          {rows.length === data.length
            ? `${data.length}행`
            : `${rows.length}/${data.length}행 (필터됨)`}
        </span>
        <HideColumnsMenu table={table} />
      </div>

      <div
        ref={containerRef}
        style={{ ...containerStyle, height }}
        role="grid"
      >
        {/* sticky header — 정렬 + 필터 */}
        <div
          style={{
            ...headerRowStyle,
            gridTemplateColumns,
            minHeight: headerHeight,
          }}
          role="row"
        >
          {table.getHeaderGroups()[0]?.headers.map((h) => (
            <HeaderCell key={h.id} header={h} />
          ))}
        </div>

        {/* virtualized body */}
        {rows.length === 0 ? (
          <div style={emptyRowStyle}>
            {emptyText ?? (data.length === 0 ? "데이터 없음" : "조건에 맞는 행 없음")}
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index];
              return (
                <div
                  key={row.id}
                  role="row"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns,
                    borderBottom: "1px solid var(--airgrid-border-subtle, #eceef1)",
                  }}
                  data-airgrid-row
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as AirgridMeta | undefined;
                    return (
                      <div
                        key={cell.id}
                        role="gridcell"
                        style={{
                          ...cellStyle,
                          textAlign: meta?.align === "right" ? "right" : "left",
                          justifyContent: meta?.align === "right" ? "flex-end" : "flex-start",
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 기본 스타일 ─────────────────────────────────────────────────

const controlsBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  marginBottom: 4,
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "auto",
  background: "var(--airgrid-bg, #ffffff)",
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 6,
  fontSize: 13,
};

const headerRowStyle: React.CSSProperties = {
  display: "grid",
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "var(--airgrid-header-bg, #f9fafb)",
  borderBottom: "1px solid var(--airgrid-border, #e5e7eb)",
};

const cellStyle: React.CSSProperties = {
  padding: "7px 10px",
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const emptyRowStyle: React.CSSProperties = {
  padding: 40,
  textAlign: "center",
  color: "var(--airgrid-empty-fg, #9ca3af)",
};
