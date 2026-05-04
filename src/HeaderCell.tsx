// 헤더 셀 — 정렬 indicator + 컬럼별 필터 input.

import type { Header } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { AirgridMeta } from "./types";

export function HeaderCell<TRow>({ header }: { header: Header<TRow, unknown> }) {
  const meta = header.column.columnDef.meta as AirgridMeta | undefined;
  const align = meta?.align === "right" ? "right" : "left";
  const canSort = header.column.getCanSort();
  const sort = header.column.getIsSorted(); // false | "asc" | "desc"

  return (
    <div
      role="columnheader"
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--airgrid-border-subtle, #eceef1)",
      }}
    >
      <button
        type="button"
        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
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
      >
        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
        {sort === "asc" && <span aria-hidden="true">↑</span>}
        {sort === "desc" && <span aria-hidden="true">↓</span>}
      </button>
      {meta?.filterType && (
        <FilterInput
          filterType={meta.filterType}
          selectOptions={meta.selectOptions}
          value={header.column.getFilterValue()}
          onChange={(v) => header.column.setFilterValue(v)}
        />
      )}
    </div>
  );
}

function FilterInput({
  filterType, selectOptions, value, onChange,
}: {
  filterType: string;
  selectOptions?: string[];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 11,
    padding: "2px 6px",
    border: "none",
    borderTop: "1px solid var(--airgrid-border-subtle, #eceef1)",
    background: "var(--airgrid-filter-bg, #ffffff)",
    color: "var(--airgrid-filter-fg, #1f2937)",
    boxSizing: "border-box",
  };

  if (filterType === "text") {
    return (
      <input
        type="text"
        placeholder="검색…"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        style={baseStyle}
      />
    );
  }

  if (filterType === "numberRange") {
    const range = (value as { min?: number; max?: number } | undefined) ?? {};
    return (
      <div style={{ display: "flex", borderTop: "1px solid var(--airgrid-border-subtle, #eceef1)" }}>
        <input
          type="number"
          placeholder="min"
          value={range.min ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...range, min: v });
          }}
          style={{ ...baseStyle, borderTop: "none", borderRight: "1px solid var(--airgrid-border-subtle, #eceef1)" }}
        />
        <input
          type="number"
          placeholder="max"
          value={range.max ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...range, max: v });
          }}
          style={{ ...baseStyle, borderTop: "none" }}
        />
      </div>
    );
  }

  if (filterType === "boolean") {
    const v = value === true ? "true" : value === false ? "false" : "any";
    return (
      <select
        value={v}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === "any" ? undefined : next === "true");
        }}
        style={baseStyle}
      >
        <option value="any">전체</option>
        <option value="true">예</option>
        <option value="false">아니오</option>
      </select>
    );
  }

  if (filterType === "select" && selectOptions) {
    const selected = (Array.isArray(value) ? value : []) as string[];
    return (
      <select
        multiple
        value={selected}
        onChange={(e) => {
          const next = Array.from(e.target.selectedOptions, (o) => o.value);
          onChange(next.length === 0 ? undefined : next);
        }}
        style={{ ...baseStyle, height: 60 }}
      >
        {selectOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return null;
}
