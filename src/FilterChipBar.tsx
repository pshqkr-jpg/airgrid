// 그리드 상단 활성 필터 / 정렬 chip 표시.
//
// 클릭 시 해당 컬럼의 popover 재오픈, X 시 즉시 제거. 비어있을 땐 안 보임.

import type { Table, ColumnFiltersState, SortingState } from "@tanstack/react-table";
import type { AirgridMeta } from "./types";

export type FilterChipBarProps<TRow> = {
  table: Table<TRow>;
  /** chip 클릭 시 popover 재오픈할 위치 — 호스트 (DataGrid) 가 columnId 받아 처리. */
  onChipClick?: (columnId: string, anchor: { x: number; y: number }) => void;
};

export function FilterChipBar<TRow>({ table, onChipClick }: FilterChipBarProps<TRow>) {
  const filters: ColumnFiltersState = table.getState().columnFilters;
  const sorting: SortingState = table.getState().sorting;

  if (filters.length === 0 && sorting.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: "6px 8px",
        marginBottom: 4,
        background: "var(--airgrid-chipbar-bg, #f9fafb)",
        border: "1px solid var(--airgrid-border, #e5e7eb)",
        borderRadius: 6,
        fontSize: 11,
      }}
    >
      {filters.map((f) => {
        const col = table.getColumn(f.id);
        if (!col) return null;
        const meta = col.columnDef.meta as AirgridMeta | undefined;
        return (
          <Chip
            key={`f-${f.id}`}
            kind="filter"
            label={`${headerText(col.columnDef.header)} ${formatFilterValue(meta?.filterType, f.value)}`}
            onClick={(e) => onChipClick?.(f.id, { x: e.clientX, y: e.clientY })}
            onClear={() => col.setFilterValue(undefined)}
          />
        );
      })}
      {sorting.map((s, idx) => {
        const col = table.getColumn(s.id);
        if (!col) return null;
        return (
          <Chip
            key={`s-${s.id}`}
            kind="sort"
            label={`${idx + 1}. ${headerText(col.columnDef.header)} ${s.desc ? "↓" : "↑"}`}
            onClick={(e) => onChipClick?.(s.id, { x: e.clientX, y: e.clientY })}
            onClear={() => col.clearSorting()}
          />
        );
      })}
    </div>
  );
}

function Chip({
  kind, label, onClick, onClear,
}: {
  kind: "filter" | "sort";
  label: string;
  onClick: (e: React.MouseEvent) => void;
  onClear: () => void;
}) {
  const bg = kind === "filter" ? "var(--airgrid-chip-filter-bg, #e0e7ff)" : "var(--airgrid-chip-sort-bg, #d1fae5)";
  const fg = kind === "filter" ? "var(--airgrid-chip-filter-fg, #4338ca)" : "var(--airgrid-chip-sort-fg, #047857)";
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 4px 2px 8px",
        background: bg,
        color: fg,
        borderRadius: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        aria-label="제거"
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: 14,
          padding: "0 4px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </span>
  );
}

function headerText(header: unknown): string {
  if (typeof header === "string") return header;
  return "";
}

function formatFilterValue(filterType: string | undefined, v: unknown): string {
  if (v == null || v === "") return "";
  if (filterType === "text") return `"${v}" 포함`;
  if (filterType === "numberRange") {
    const r = v as { min?: number; max?: number };
    if (r.min != null && r.max != null) return `${r.min}~${r.max}`;
    if (r.min != null) return `≥ ${r.min}`;
    if (r.max != null) return `≤ ${r.max}`;
    return "";
  }
  if (filterType === "boolean") return v === true ? "예" : "아니오";
  if (filterType === "select" && Array.isArray(v)) return `${v.length}개 선택`;
  return String(v);
}
