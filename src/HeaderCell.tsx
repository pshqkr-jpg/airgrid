// 헤더 셀 — 좌클릭 정렬, 우클릭 popover, 드래그 핸들로 컬럼 reorder.
//
// 항상 보이는 input row 는 제거 (Phase A1). 필터 input 은 popover 안에서만.
// 활성 필터 / 정렬 indicator 가 헤더에 작은 마커로 표시.
// 컬럼 reorder 는 핸들(⋮⋮) 영역 드래그로만 — sort 클릭과 충돌 방지 (Phase A4).

import { useState } from "react";
import type { Header } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: header.column.id });

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 3 : "auto",
    borderRight: "1px solid var(--airgrid-border-subtle, #eceef1)",
    // 헤더 background 와 하단 경계선은 cell 단위로 — row 에 두면 가로
    // 스크롤 시 우측 overflow 영역에 안 깔리는 이슈.
    background: "var(--airgrid-header-bg, #f9fafb)",
    borderBottom: "1px solid var(--airgrid-border, #e5e7eb)",
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    position: "relative", // ResizeHandle 의 absolute 기준점.
  };

  return (
    <div
      ref={setNodeRef}
      role="columnheader"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(header.column.id, { x: e.clientX, y: e.clientY });
      }}
      style={wrapperStyle}
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
          padding: "6px 4px 6px 10px",
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
          flex: 1,
          minWidth: 0,
        }}
        title="좌클릭: 정렬 / 우클릭: 필터·정렬·숨기기 메뉴"
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        {sort === "asc" && <SortBadge index={sortIndex} dir="asc" />}
        {sort === "desc" && <SortBadge index={sortIndex} dir="desc" />}
        {/* 필터 활성 표시는 그리드 상단 칩 행에서 처리 — 헤더 dot 제거 */}
      </button>
      <DragHandle attributes={attributes} listeners={listeners} />
      <ResizeHandle header={header} />
    </div>
  );
}

// 헤더 우측 폭 조절 핸들. wrapper 우측 가장자리에 absolute 로 8px 띠 배치 +
// 양옆으로 4px 씩 살짝 튀어나오게 해 다음 셀 영역과 겹쳐도 잡히게.
// - mousedown 에서 stopPropagation + preventDefault: dnd-kit sortable 활성화 차단
// - hover 시 보이는 줄, isResizing 시 진하게 — 사용자가 핸들 위치를 인지 가능
function ResizeHandle<TRow>({ header }: { header: Header<TRow, unknown> }) {
  const isResizing = header.column.getIsResizing();
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        header.getResizeHandler()(e);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        header.getResizeHandler()(e);
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="separator"
      aria-orientation="vertical"
      aria-label="컬럼 폭 조절"
      title="드래그하여 컬럼 폭 조절"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: -4,
        width: 8,
        cursor: "col-resize",
        userSelect: "none",
        touchAction: "none",
        zIndex: 4,
        // 가운데 1px 줄 — hover/resizing 시 보이게.
        background: isResizing
          ? "linear-gradient(to right, transparent 3px, var(--airgrid-resize-active, #4f46e5) 3px, var(--airgrid-resize-active, #4f46e5) 5px, transparent 5px)"
          : hover
          ? "linear-gradient(to right, transparent 3px, var(--airgrid-resize-hover, #9ca3af) 3px, var(--airgrid-resize-hover, #9ca3af) 5px, transparent 5px)"
          : "transparent",
      }}
    />
  );
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  return (
    <span
      {...attributes}
      {...listeners}
      role="button"
      aria-label="컬럼 순서 변경"
      title="드래그하여 컬럼 순서 변경"
      style={{
        cursor: "grab",
        padding: "0 1px",
        color: "var(--airgrid-empty-fg, #9ca3af)",
        fontSize: 9,
        lineHeight: 1,
        userSelect: "none",
        touchAction: "none",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      ⋮⋮
    </span>
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

// 필터 indicator 활성 여부. 공백만 / 빈 객체 / 빈 배열 등 의미 없는 값은 false.
// text/numberRange 객체 형태 ({ op, value, min, max }) 도 인식.
function isFilterActive(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const op = typeof o.op === "string" ? o.op : null;
    if (op === "isEmpty" || op === "isNotEmpty") return true;
    if (typeof o.value === "string" && o.value.trim() !== "") return true;
    if (typeof o.value === "number" && Number.isFinite(o.value)) return true;
    if (typeof o.min === "number" && Number.isFinite(o.min)) return true;
    if (typeof o.max === "number" && Number.isFinite(o.max)) return true;
    return false;
  }
  return true;
}

// FilterDot 제거됨 — 필터 활성 표시는 DataGrid 상단의 칩 행이 담당.
// 헤더에 점 두 개 (sort + filter) 가 겹쳐 보이는 시각 부담을 줄임.
