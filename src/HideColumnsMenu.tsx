// 컬럼 숨김 / 표시 토글 메뉴 — 우측 상단 작은 버튼 → popover.
//
// 호스트 CSS 가 input/button 을 적극 reset 해도 망가지지 않게 native checkbox
// 대신 커스텀 토글 마커 (✓ / 빈) 사용. 컬럼명 검색 input 으로 많은 컬럼에서
// 빠르게 찾기. defaultViewLocked 면 visibility 변경 시 onHideRequest 콜백으로
// fork 흐름 위임.

import { useState, useRef, useEffect, useMemo } from "react";
import type { Table } from "@tanstack/react-table";

export type HideColumnsMenuProps<TRow> = {
  table: Table<TRow>;
  defaultViewLocked?: boolean;
  onHideRequest?: (columnId: string) => void;
};

export function HideColumnsMenu<TRow>({
  table, defaultViewLocked, onHideRequest,
}: HideColumnsMenuProps<TRow>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // 닫힐 때 search 초기화 — 다음 오픈 시 깨끗한 상태.
  useEffect(() => { if (!open) setSearch(""); }, [open]);

  const allColumns = table.getAllLeafColumns();
  const visibleCount = allColumns.filter((c) => c.getIsVisible()).length;

  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allColumns;
    return allColumns.filter((c) =>
      String(c.columnDef.header).toLowerCase().includes(q),
    );
  }, [allColumns, search]);

  const visible = matched.filter((c) => c.getIsVisible());
  const hidden = matched.filter((c) => !c.getIsVisible());

  const toggle = (columnId: string) => {
    const col = table.getColumn(columnId);
    if (!col) return;
    if (defaultViewLocked && onHideRequest) {
      onHideRequest(columnId);
      setOpen(false);
      return;
    }
    col.toggleVisibility();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="컬럼 표시 / 숨김"
        style={menuButtonStyle}
      >
        ⚙ 컬럼 ({visibleCount}/{allColumns.length})
      </button>
      {open && (
        <div style={popoverStyle}>
          <input
            type="text"
            autoFocus
            placeholder="컬럼명 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInputStyle}
          />

          <Section
            label={`표시 중 (${visible.length})`}
            columns={visible}
            checked
            onToggle={toggle}
          />
          <Section
            label={`숨김 (${hidden.length})`}
            columns={hidden}
            checked={false}
            onToggle={toggle}
          />

          {matched.length === 0 && (
            <div style={emptyStyle}>일치하는 컬럼 없음</div>
          )}

          {!defaultViewLocked && (
            <button
              type="button"
              onClick={() => table.resetColumnVisibility()}
              style={resetButtonStyle}
            >
              모두 표시로 초기화
            </button>
          )}
          {defaultViewLocked && (
            <div style={lockedHintStyle}>
              기본 보기에선 컬럼 숨김 ✗ — 변경하면 새 보기로 저장됩니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section<TRow>({
  label, columns, checked, onToggle,
}: {
  label: string;
  columns: ReturnType<Table<TRow>["getAllLeafColumns"]>;
  checked: boolean;
  onToggle: (columnId: string) => void;
}) {
  if (columns.length === 0) return null;
  return (
    <>
      <div style={sectionLabelStyle}>{label}</div>
      {columns.map((column) => (
        <button
          key={column.id}
          type="button"
          onClick={() => onToggle(column.id)}
          style={itemButtonStyle}
        >
          <ToggleMarker on={checked} />
          <span style={itemLabelStyle}>{String(column.columnDef.header)}</span>
        </button>
      ))}
    </>
  );
}

function ToggleMarker({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 14,
        height: 14,
        flexShrink: 0,
        borderRadius: 3,
        border: on
          ? "1px solid var(--airgrid-active-fg, #4338ca)"
          : "1px solid var(--airgrid-border, #d1d5db)",
        background: on
          ? "var(--airgrid-active-fg, #4338ca)"
          : "transparent",
        color: "#ffffff",
        fontSize: 10,
        lineHeight: 1,
      }}
    >
      {on ? "✓" : ""}
    </span>
  );
}

const menuButtonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  background: "var(--airgrid-bg, #ffffff)",
  color: "var(--airgrid-header-fg, #6b7280)",
  borderRadius: 4,
  cursor: "pointer",
};

const popoverStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  minWidth: 220,
  maxHeight: 480,
  overflowY: "auto",
  background: "var(--airgrid-bg, #ffffff)",
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  zIndex: 10,
  padding: 4,
  color: "var(--airgrid-fg, #1f2937)",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 12,
  padding: "5px 8px",
  margin: "2px 0 4px",
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 4,
  background: "var(--airgrid-bg, #ffffff)",
  color: "var(--airgrid-fg, #1f2937)",
  boxSizing: "border-box",
  height: "auto",
  appearance: "none",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--airgrid-empty-fg, #9ca3af)",
  padding: "6px 8px 2px",
};

const itemButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "5px 8px",
  fontSize: 12,
  background: "transparent",
  border: "none",
  borderRadius: 3,
  color: "var(--airgrid-fg, #1f2937)",
  cursor: "pointer",
  textAlign: "left",
  height: "auto",
};

const itemLabelStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const emptyStyle: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 11,
  color: "var(--airgrid-empty-fg, #9ca3af)",
  textAlign: "center",
};

const resetButtonStyle: React.CSSProperties = {
  marginTop: 4,
  width: "100%",
  padding: "5px 8px",
  fontSize: 11,
  border: "none",
  borderTop: "1px solid var(--airgrid-border-subtle, #eceef1)",
  background: "transparent",
  color: "var(--airgrid-header-fg, #6b7280)",
  cursor: "pointer",
  textAlign: "left",
  height: "auto",
};

const lockedHintStyle: React.CSSProperties = {
  padding: "6px 8px",
  marginTop: 4,
  borderTop: "1px solid var(--airgrid-border-subtle, #eceef1)",
  fontSize: 10,
  color: "var(--airgrid-empty-fg, #9ca3af)",
  lineHeight: 1.4,
};
