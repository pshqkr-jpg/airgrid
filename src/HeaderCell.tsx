// 헤더 셀 — 좌클릭 정렬, 우클릭 popover.
//
// 항상 보이는 input row 는 제거 (Phase A1). 필터 input 은 popover 안에서만.
// 활성 필터 / 정렬 indicator 가 헤더에 작은 마커로 표시.

import type { Header } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { AirgridMeta } from "./types";

export type HeaderCellProps<TRow> = {
  header: Header<TRow, unknown>;
  /** 우클릭 시 호출. 호출자 (DataGrid) 가 popover 띄우기. */
  onContextMenu?: (columnId: string, anchor: { x: number; y: number }) => void;
};

export function HeaderCell<TRow>({ header, onContextMenu }: HeaderCellProps<TRow>) {
  const meta = header.column.columnDef.meta as AirgridMeta | undefined;
  const align = meta?.align === "right" ? "right" : "left";
  const canSort = header.column.getCanSort();
  const sort = header.column.getIsSorted(); // false | "asc" | "desc"
  const sortIndex = header.column.getSortIndex(); // -1 | 0 | 1 | 2 ...
  const hasFilter = header.column.getFilterValue() != null
    && header.column.getFilterValue() !== "";

  return (
    <div
      role="columnheader"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(header.column.id, { x: e.clientX, y: e.clientY });
      }}
      style={{ borderRight: "1px solid var(--airgrid-border-subtle, #eceef1)" }}
    >
      <button
        type="button"
        onClick={(e) => {
          if (!canSort) return;
          // Shift+click 은 다중 정렬 (TanStack 기본 동작).
          header.column.getToggleSortingHandler()?.(e);
        }}
        disabled={!canSort}
        style={{
          textAlign: align,
          padding: "6px 10px",
          fontWeight: 600,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          color: "var(--airgrid-header-fg, #6b7280)",
          background: "transparent",
          border: "none",
          cursor: canSort ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: align === "right" ? "flex-end" : "flex-start",
          gap: 4,
          width: "100%",
        }}
        title="좌클릭: 정렬 / 우클릭: 필터·정렬·숨기기 메뉴"
      >
        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
        {sort === "asc" && <SortBadge index={sortIndex} dir="asc" />}
        {sort === "desc" && <SortBadge index={sortIndex} dir="desc" />}
        {hasFilter && <FilterDot />}
      </button>
    </div>
  );
}

function SortBadge({ index, dir }: { index: number; dir: "asc" | "desc" }) {
  // 다중 정렬 시 1·2·3 우선순위 표시. 단일 정렬 (index=0) 은 화살표만.
  const showIndex = index > 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 10,
        color: "var(--airgrid-sort-fg, #047857)",
      }}
      aria-label={`정렬 ${dir === "asc" ? "오름차순" : "내림차순"}${showIndex ? `, 우선순위 ${index + 1}` : ""}`}
    >
      <span aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>
      {showIndex && (
        <span
          style={{
            display: "inline-block",
            minWidth: 14,
            padding: "0 3px",
            borderRadius: 7,
            background: "var(--airgrid-sort-badge-bg, #d1fae5)",
            fontSize: 9,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: "13px",
          }}
        >
          {index + 1}
        </span>
      )}
    </span>
  );
}

function FilterDot() {
  return (
    <span
      aria-label="필터 활성"
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--airgrid-filter-dot, #4f46e5)",
        marginLeft: 2,
      }}
    />
  );
}
