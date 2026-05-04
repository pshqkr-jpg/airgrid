// 컬럼 숨김 / 표시 토글 메뉴 — 우측 상단 작은 버튼 → popover.
//
// defaultViewLocked 면 visibility 변경 시 onHideRequest 콜백 호출 — 호스트가
// fork 흐름 ("새 view 로 저장하시겠어요?") 처리. 그 사이엔 visibility 변경 ✗.

import { useState, useRef, useEffect } from "react";
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
                onChange={() => {
                  if (defaultViewLocked && onHideRequest) {
                    onHideRequest(column.id);
                    setOpen(false);
                    return;
                  }
                  column.toggleVisibility();
                }}
              />
              <span>{String(column.columnDef.header)}</span>
            </label>
          ))}
          {!defaultViewLocked && (
            <button
              type="button"
              onClick={() => table.resetColumnVisibility()}
              style={popoverResetStyle}
            >
              모두 표시
            </button>
          )}
          {defaultViewLocked && (
            <div style={{ ...popoverHeaderStyle, padding: "4px 8px", fontSize: 9, textTransform: "none", color: "var(--airgrid-empty-fg, #9ca3af)" }}>
              전체 view 에선 컬럼 숨김 ✗ — 변경하면 새 view 로 저장됩니다.
            </div>
          )}
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
