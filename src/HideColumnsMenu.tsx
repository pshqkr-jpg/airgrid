// 컬럼 숨김 / 표시 토글 메뉴 — 우측 상단 작은 버튼 → popover.

import { useState, useRef, useEffect } from "react";
import type { Table } from "@tanstack/react-table";

export function HideColumnsMenu<TRow>({ table }: { table: Table<TRow> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기.
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

  const allColumns = table.getAllLeafColumns();
  const visibleCount = allColumns.filter((c) => c.getIsVisible()).length;

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
          <div style={popoverHeaderStyle}>표시할 컬럼</div>
          {allColumns.map((column) => (
            <label key={column.id} style={popoverItemStyle}>
              <input
                type="checkbox"
                checked={column.getIsVisible()}
                onChange={column.getToggleVisibilityHandler()}
              />
              <span>{String(column.columnDef.header)}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => table.resetColumnVisibility()}
            style={popoverResetStyle}
          >
            모두 표시
          </button>
        </div>
      )}
    </div>
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
  minWidth: 180,
  background: "var(--airgrid-bg, #ffffff)",
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  zIndex: 10,
  padding: 4,
};

const popoverHeaderStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--airgrid-header-fg, #6b7280)",
  padding: "6px 8px 4px",
};

const popoverItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  fontSize: 12,
  cursor: "pointer",
};

const popoverResetStyle: React.CSSProperties = {
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
};
