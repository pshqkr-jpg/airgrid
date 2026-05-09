// 다중 정렬 우선순위 패널 — Airtable 의 "Sort by..." 다이얼로그.
//
// 활성 정렬을 list 로 보여주고 native HTML5 drag 로 순서 변경. 각 행은
// asc/desc 토글 + 제거 버튼. 빈 상태에선 정렬 추가 dropdown.
//
// drag-and-drop 라이브러리 ✗ — native API 만으로 충분 (데스크톱 셀러 페르소나).

import { useState, useEffect, useRef } from "react";
import type { Table, ColumnSort } from "@tanstack/react-table";

export type SortPriorityPanelProps<TRow> = {
  table: Table<TRow>;
  anchor: { x: number; y: number };
  onClose: () => void;
};

export function SortPriorityPanel<TRow>({
  table, anchor, onClose,
}: SortPriorityPanelProps<TRow>) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 외부 클릭 / Esc 으로 닫기.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const sorting = table.getState().sorting;
  const sortableColumns = table.getAllLeafColumns().filter((c) => c.getCanSort());
  const sortedIds = new Set(sorting.map((s) => s.id));
  const candidates = sortableColumns.filter((c) => !sortedIds.has(c.id));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...sorting];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    table.setSorting(next);
  };

  const toggleDir = (idx: number) => {
    const next = sorting.map((s, i) =>
      i === idx ? { ...s, desc: !s.desc } : s,
    );
    table.setSorting(next);
  };

  const remove = (idx: number) => {
    table.setSorting(sorting.filter((_, i) => i !== idx));
  };

  const addSort = (columnId: string) => {
    const next: ColumnSort[] = [...sorting, { id: columnId, desc: false }];
    table.setSorting(next);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: anchor.y,
        left: anchor.x,
        zIndex: 100,
        minWidth: 320,
        background: "var(--airgrid-bg, #ffffff)",
        border: "1px solid var(--airgrid-border, #e5e7eb)",
        borderRadius: 6,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: 10,
        fontSize: 12,
      }}
      role="dialog"
      aria-label="정렬 우선순위"
    >
      <div style={titleStyle}>정렬 우선순위</div>

      {sorting.length === 0 ? (
        <div style={emptyStyle}>정렬이 없습니다. 아래에서 추가하세요.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {sorting.map((s, idx) => {
            const col = table.getColumn(s.id);
            const headerText = col ? String(col.columnDef.header) : s.id;
            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex == null) return;
                  reorder(dragIndex, idx);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  background: dragIndex === idx
                    ? "var(--airgrid-active-bg, #eef2ff)"
                    : "var(--airgrid-header-bg, #f9fafb)",
                  border: "1px solid var(--airgrid-border-subtle, #eceef1)",
                  borderRadius: 4,
                  cursor: "grab",
                }}
                aria-label={`${idx + 1}순위 정렬 ${headerText}`}
              >
                <span style={dragHandleStyle} aria-hidden>⋮⋮</span>
                <span style={priorityBadgeStyle}>{idx + 1}</span>
                <span style={{ flex: 1 }}>{headerText}</span>
                <button
                  type="button"
                  onClick={() => toggleDir(idx)}
                  style={dirButtonStyle}
                >
                  {s.desc ? "↓ 내림차순" : "↑ 오름차순"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="정렬 제거"
                  style={removeButtonStyle}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {candidates.length > 0 && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                addSort(e.target.value);
                e.target.value = "";
              }
            }}
            style={addSelectStyle}
          >
            <option value="">+ 정렬 컬럼 추가…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{String(c.columnDef.header)}</option>
            ))}
          </select>
        </div>
      )}

      {sorting.length > 0 && (
        <button
          type="button"
          onClick={() => table.setSorting([])}
          style={{ ...removeButtonStyle, marginTop: 6, width: "100%", padding: "5px 8px" }}
        >
          전체 정렬 해제
        </button>
      )}
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--airgrid-empty-fg, #9ca3af)",
  marginBottom: 8,
};

const emptyStyle: React.CSSProperties = {
  padding: 12,
  textAlign: "center",
  fontSize: 11,
  color: "var(--airgrid-empty-fg, #9ca3af)",
  background: "var(--airgrid-header-bg, #f9fafb)",
  borderRadius: 4,
  marginBottom: 8,
};

const dragHandleStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--airgrid-empty-fg, #9ca3af)",
  cursor: "grab",
};

const priorityBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  minWidth: 18,
  padding: "1px 5px",
  borderRadius: 9,
  background: "var(--airgrid-sort-badge-bg, #d1fae5)",
  color: "var(--airgrid-sort-fg, #047857)",
  fontSize: 10,
  fontWeight: 600,
  textAlign: "center",
};

// 호스트 앱이 button { height/background/color } 를 강하게 reset 하더라도
// 패널 안 버튼이 안 망가지게 inline 으로 강제.
const dirButtonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  height: "auto",
  minHeight: 0,
  border: "1px solid var(--airgrid-border, #d1d5db)",
  borderRadius: 3,
  background: "var(--airgrid-bg, #ffffff)",
  color: "var(--airgrid-fg, #1f2937)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

const removeButtonStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "2px 8px",
  height: "auto",
  minHeight: 0,
  border: "1px solid var(--airgrid-border-subtle, #eceef1)",
  borderRadius: 3,
  background: "transparent",
  color: "var(--airgrid-empty-fg, #6b7280)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const addSelectStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 11,
  padding: "4px 6px",
  height: "auto",
  minHeight: 0,
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 4,
  background: "var(--airgrid-bg, #ffffff)",
  color: "var(--airgrid-fg, #1f2937)",
  fontFamily: "inherit",
  appearance: "auto",
  cursor: "pointer",
  // React.CSSProperties 타입이 좁아 별도 cast.
  ...({ WebkitAppearance: "auto" } as unknown as React.CSSProperties),
};
