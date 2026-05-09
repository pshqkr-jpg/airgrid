// 헤더 우클릭 시 띄우는 popover. 정렬 + 필터 + 컬럼 hide 한 곳에서.

import { useEffect, useRef } from "react";
import type { Column } from "@tanstack/react-table";
import type {
  AirgridMeta,
  TextFilter, TextFilterOp,
  NumberFilter, NumberFilterOp,
} from "./types";
import { isTextFilterActive, isNumberFilterActive } from "./filterFns";

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
          {isAnyFilterActive(filterType, column.getFilterValue()) && (
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

// Airtable 스타일 연산자 목록.
const TEXT_OPS: { value: TextFilterOp; label: string }[] = [
  { value: "contains",    label: "포함" },
  { value: "notContains", label: "미포함" },
  { value: "is",          label: "일치" },
  { value: "isNot",       label: "불일치" },
  { value: "startsWith",  label: "~로 시작" },
  { value: "endsWith",    label: "~로 끝남" },
  { value: "isEmpty",     label: "비어있음" },
  { value: "isNotEmpty",  label: "값 있음" },
];

const NUM_OPS: { value: NumberFilterOp; label: string }[] = [
  { value: "between",    label: "범위" },
  { value: "eq",         label: "=" },
  { value: "neq",        label: "≠" },
  { value: "lt",         label: "<" },
  { value: "gt",         label: ">" },
  { value: "lte",        label: "≤" },
  { value: "gte",        label: "≥" },
  { value: "isEmpty",    label: "비어있음" },
  { value: "isNotEmpty", label: "값 있음" },
];

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
    height: "auto",
    minHeight: 0,
    border: "1px solid var(--airgrid-border, #e5e7eb)",
    borderRadius: 4,
    background: "var(--airgrid-bg, #ffffff)",
    color: "var(--airgrid-filter-fg, #1f2937)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  // 호스트 앱이 select { appearance: none } 으로 reset 한 경우에도 화살표가
  // 보이도록 강제. WebkitAppearance 는 React.CSSProperties 타입이 좁아서
  // 별도 객체에 cast 후 spread.
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "auto",
    cursor: "pointer",
    ...({ WebkitAppearance: "auto" } as unknown as React.CSSProperties),
  };

  if (filterType === "text") {
    // legacy string -> TextFilter 매핑.
    const f: TextFilter =
      typeof value === "string"
        ? { op: "contains", value }
        : (value && typeof value === "object")
          ? (value as TextFilter)
          : {};
    const op: TextFilterOp = f.op ?? "contains";
    const valueDisabled = op === "isEmpty" || op === "isNotEmpty";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <select
          value={op}
          onChange={(e) => {
            const next = e.target.value as TextFilterOp;
            if (next === "isEmpty" || next === "isNotEmpty") {
              onChange({ op: next });
            } else {
              onChange({ op: next, value: f.value ?? "" });
            }
          }}
          style={selectStyle}
        >
          {TEXT_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="text"
          autoFocus
          placeholder={valueDisabled ? "(값 입력 불필요)" : "검색…"}
          value={f.value ?? ""}
          disabled={valueDisabled}
          onChange={(e) => onChange({ op, value: e.target.value })}
          style={{
            ...inputStyle,
            opacity: valueDisabled ? 0.5 : 1,
            background: valueDisabled
              ? "var(--airgrid-header-bg, #f9fafb)"
              : "var(--airgrid-bg, #ffffff)",
          }}
        />
      </div>
    );
  }

  if (filterType === "numberRange") {
    // legacy { min, max } -> NumberFilter 매핑.
    let f: NumberFilter;
    if (value && typeof value === "object") {
      const obj = value as NumberFilter;
      f = (!obj.op && (obj.min != null || obj.max != null))
        ? { op: "between", min: obj.min, max: obj.max }
        : obj;
    } else {
      f = {};
    }
    const op: NumberFilterOp = f.op ?? "between";
    const setOp = (next: NumberFilterOp) => {
      if (next === "isEmpty" || next === "isNotEmpty") {
        onChange({ op: next });
      } else if (next === "between") {
        onChange({ op: next, min: f.min, max: f.max });
      } else {
        onChange({ op: next, value: f.value });
      }
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as NumberFilterOp)}
          style={selectStyle}
        >
          {NUM_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {op === "between" ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="number"
              autoFocus
              placeholder="min"
              value={f.min ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                onChange({ op: "between", min: v, max: f.max });
              }}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="max"
              value={f.max ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                onChange({ op: "between", min: f.min, max: v });
              }}
              style={inputStyle}
            />
          </div>
        ) : (op === "isEmpty" || op === "isNotEmpty") ? (
          <input
            type="text"
            placeholder="(값 입력 불필요)"
            disabled
            style={{
              ...inputStyle,
              opacity: 0.5,
              background: "var(--airgrid-header-bg, #f9fafb)",
            }}
          />
        ) : (
          <input
            type="number"
            autoFocus
            placeholder="값"
            value={f.value ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : Number(e.target.value);
              onChange({ op, value: v });
            }}
            style={inputStyle}
          />
        )}
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
        style={selectStyle}
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
        style={{ ...selectStyle, height: 100 }}
      >
        {selectOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return null;
}

// 모든 필터 타입에 대해 "활성" 여부 — 초기화 버튼 노출 판단.
function isAnyFilterActive(filterType: string, value: unknown): boolean {
  if (value == null) return false;
  if (filterType === "text") return isTextFilterActive(value);
  if (filterType === "numberRange") return isNumberFilterActive(value);
  if (filterType === "select") return Array.isArray(value) && value.length > 0;
  if (filterType === "boolean") return value !== "any" && value != null;
  return false;
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
