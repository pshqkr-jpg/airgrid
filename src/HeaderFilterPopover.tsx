// 헤더 우클릭 시 띄우는 popover. 정렬 + 필터 + 컬럼 hide 한 곳에서.

import { useEffect, useRef } from "react";
import type { Column } from "@tanstack/react-table";
import type { AirgridMeta } from "./types";

export type HeaderFilterPopoverProps<TRow> = {
  column: Column<TRow, unknown>;
  /** 화면 좌표 (clientX/clientY). 우클릭 위치 기준 popover 위치. */
  anchor: { x: number; y: number };
  onClose: () => void;
  /** default view 에서 visible 변경 시도 시 호출. 호출자가 fork 흐름 시작. */
  onHideRequest?: (columnId: string) => void;
  /** default view 일 때 hide 누르면 fork 안내. */
  defaultViewLocked?: boolean;
};

export function HeaderFilterPopover<TRow>({
  column, anchor, onClose, onHideRequest, defaultViewLocked,
}: HeaderFilterPopoverProps<TRow>) {
  const ref = useRef<HTMLDivElement>(null);

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

  const meta = column.columnDef.meta as AirgridMeta | undefined;
  const filterType = meta?.filterType;
  const sort = column.getIsSorted();

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: anchor.y,
        left: anchor.x,
        zIndex: 100,
        minWidth: 240,
        background: "var(--airgrid-bg, #ffffff)",
        border: "1px solid var(--airgrid-border, #e5e7eb)",
        borderRadius: 6,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: 8,
        fontSize: 12,
      }}
      role="menu"
    >
      {/* 정렬 섹션 */}
      {column.getCanSort() && (
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>정렬</div>
          <div style={{ display: "flex", gap: 4 }}>
            <PopoverButton
              active={sort === "asc"}
              onClick={() => { column.toggleSorting(false, false); onClose(); }}
            >
              ↑ 오름차순
            </PopoverButton>
            <PopoverButton
              active={sort === "desc"}
              onClick={() => { column.toggleSorting(true, false); onClose(); }}
            >
              ↓ 내림차순
            </PopoverButton>
            {sort && (
              <PopoverButton onClick={() => { column.clearSorting(); onClose(); }}>
                해제
              </PopoverButton>
            )}
          </div>
          {sort && (
            <div style={{ fontSize: 10, color: "var(--airgrid-empty-fg, #9ca3af)", marginTop: 4 }}>
              Shift+클릭 또는 다중정렬 패널로 다중 정렬
            </div>
          )}
        </div>
      )}

      {/* 필터 섹션 */}
      {filterType && (
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>필터</div>
          <FilterInput
            filterType={filterType}
            selectOptions={meta?.selectOptions}
            value={column.getFilterValue()}
            onChange={(v) => column.setFilterValue(v)}
          />
          {column.getFilterValue() != null && column.getFilterValue() !== "" && (
            <button
              type="button"
              onClick={() => { column.setFilterValue(undefined); }}
              style={{ ...popoverButtonStyle, marginTop: 4, fontSize: 11 }}
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {/* 컬럼 hide */}
      {column.getCanHide() && (
        <div style={sectionStyle}>
          <button
            type="button"
            onClick={() => {
              if (defaultViewLocked && onHideRequest) {
                onHideRequest(column.id);
              } else {
                column.toggleVisibility(false);
              }
              onClose();
            }}
            style={{ ...popoverButtonStyle, width: "100%", textAlign: "left" }}
          >
            컬럼 숨기기
          </button>
        </div>
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
  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 12,
    padding: "4px 6px",
    border: "1px solid var(--airgrid-border, #e5e7eb)",
    borderRadius: 4,
    background: "var(--airgrid-bg, #ffffff)",
    color: "var(--airgrid-filter-fg, #1f2937)",
    boxSizing: "border-box",
  };

  if (filterType === "text") {
    return (
      <input
        type="text"
        autoFocus
        placeholder="검색…"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        style={inputStyle}
      />
    );
  }
  if (filterType === "numberRange") {
    const range = (value as { min?: number; max?: number } | undefined) ?? {};
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="number"
          autoFocus
          placeholder="min"
          value={range.min ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...range, min: v });
          }}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="max"
          value={range.max ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...range, max: v });
          }}
          style={inputStyle}
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
        style={inputStyle}
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
        style={{ ...inputStyle, height: 100 }}
      >
        {selectOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return null;
}

function PopoverButton({
  children, active, onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...popoverButtonStyle,
        background: active ? "var(--airgrid-active-bg, #eef2ff)" : "transparent",
        color: active ? "var(--airgrid-active-fg, #4338ca)" : "inherit",
      }}
    >
      {children}
    </button>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: "6px 4px",
  borderBottom: "1px solid var(--airgrid-border-subtle, #eceef1)",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--airgrid-empty-fg, #9ca3af)",
  marginBottom: 4,
};

// 호스트 CSS 가 button { height: 30px; background: var(--accent); color: var(--fg-on-accent) }
// 같이 강하게 reset 하는 경우에도 안 망가지게 height/min-height/font 모두 inline.
const popoverButtonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  height: "auto",
  minHeight: 0,
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 4,
  background: "transparent",
  color: "var(--airgrid-fg, #1f2937)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
