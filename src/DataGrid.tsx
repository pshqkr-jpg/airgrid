// airgrid DataGrid — 가상 스크롤 + CSS grid 레이아웃.
//
// 호스트 앱이 className 또는 CSS variables 로 스타일 override:
//   --airgrid-bg, --airgrid-header-bg, --airgrid-border,
//   --airgrid-border-subtle, --airgrid-row-hover.
//
// Phase 0 — 기본 표시 + 가상 스크롤만. 필터/정렬/hide/편집은 후속 Step.

import { useMemo, useRef, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef as TSColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ColumnDef } from "./types";

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
};

export function DataGrid<TRow extends Record<string, unknown>>(
  props: DataGridProps<TRow>,
) {
  const {
    data, columns, rowKey,
    height = 600, estimatedRowHeight = 32,
    className, emptyText,
  } = props;

  const tableColumns = useMemo<TSColumnDef<TRow>[]>(
    () => columns.map((c) => ({
      id: c.id,
      header: c.header,
      accessorKey: c.accessorKey,
      cell: c.cell
        ? (info) => c.cell!(info.row.original)
        : undefined,
      meta: { align: c.align, width: c.width },
    })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row[rowKey]),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
  });

  // CSS grid template — 컬럼별 width prop 또는 기본값 minmax(80px, 1fr).
  const gridTemplateColumns = useMemo(
    () => columns.map((c) => c.width ?? "minmax(80px, 1fr)").join(" "),
    [columns],
  );

  if (data.length === 0 && emptyText) {
    return (
      <div className={className} style={emptyContainerStyle}>
        {emptyText}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...containerStyle, height }}
      role="grid"
    >
      {/* sticky header */}
      <div style={{ ...headerRowStyle, gridTemplateColumns }} role="row">
        {table.getHeaderGroups()[0]?.headers.map((h) => {
          const meta = h.column.columnDef.meta as { align?: string } | undefined;
          return (
            <div
              key={h.id}
              role="columnheader"
              style={{
                ...headerCellStyle,
                textAlign: meta?.align === "right" ? "right" : "left",
              }}
            >
              {flexRender(h.column.columnDef.header, h.getContext())}
            </div>
          );
        })}
      </div>

      {/* virtualized body — 컨테이너 height = 전체 row 합 */}
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
                const meta = cell.column.columnDef.meta as
                  | { align?: string }
                  | undefined;
                return (
                  <div
                    key={cell.id}
                    role="gridcell"
                    style={{
                      ...cellStyle,
                      textAlign: meta?.align === "right" ? "right" : "left",
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
    </div>
  );
}

// ─── 기본 스타일 ─────────────────────────────────────────────────
// 모두 inline 으로 — 호스트 앱이 className 으로 override 가능. CSS variables
// 로 색상 조절 (Linear / Airtable / 토스 톤 모두 호환).

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

const headerCellStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  color: "var(--airgrid-header-fg, #6b7280)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cellStyle: React.CSSProperties = {
  padding: "7px 10px",
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const emptyContainerStyle: React.CSSProperties = {
  padding: 40,
  textAlign: "center",
  color: "var(--airgrid-empty-fg, #9ca3af)",
  background: "var(--airgrid-bg, #ffffff)",
  border: "1px dashed var(--airgrid-border, #e5e7eb)",
  borderRadius: 6,
};
