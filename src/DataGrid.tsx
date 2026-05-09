// airgrid DataGrid — 가상 스크롤 + CSS grid + 필터/정렬/hide + 편집 + persistence.
//
// 호스트 앱이 className 또는 CSS variables 로 스타일 override:
//   --airgrid-bg, --airgrid-header-bg, --airgrid-border,
//   --airgrid-border-subtle, --airgrid-row-hover, --airgrid-empty-fg.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef as TSColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnOrderState,
  type ColumnSizingState,
  type CellContext,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { ColumnDef, AirgridMeta, ViewState } from "./types";
import { pickFilterFn } from "./filterFns";
import { HeaderCell } from "./HeaderCell";
import { HeaderFilterPopover } from "./HeaderFilterPopover";
import { SortPriorityPanel } from "./SortPriorityPanel";
import { HideColumnsMenu } from "./HideColumnsMenu";
import { EditableCell } from "./EditableCell";
import { loadState, saveState } from "./persistence";

export type DataGridProps<TRow> = {
  data: TRow[];
  columns: ColumnDef<TRow>[];
  /** 행 식별 키. 메모리 안정성과 React key 정확성 위해 필수. */
  rowKey: keyof TRow & string;
  /** 컨테이너 높이. 가상 스크롤이 작동하려면 고정 높이 필요. */
  height?: number | string;
  /** 평균 행 높이 추정값 (px). 실 행 높이가 다르면 자동 보정. */
  estimatedRowHeight?: number;
  /** 컨테이너 className. 호스트 앱 스타일 hook. */
  className?: string;
  /** data 가 비었을 때 렌더할 노드. */
  emptyText?: ReactNode;
  /** 헤더 row 의 추정 높이. */
  headerHeight?: number;
  /**
   * 편집 가능 컬럼 (editable: true) 의 셀 commit 콜백.
   *   rowId      = getRowId(row) 결과 (즉 row[rowKey])
   *   columnId   = ColumnDef.id
   *   value      = number | string | null (input type 에 따라)
   * 없으면 editable 컬럼이라도 read-only 로 동작.
   */
  onCellEdit?: (rowId: string, columnId: string, value: unknown) => void;
  /**
   * 정의 시 sorting / columnFilters / columnVisibility 가 localStorage 에
   * 자동 저장 / 복원. 같은 도메인의 여러 grid 가 키 충돌하지 않게 namespace.
   */
  filterPersistKey?: string;
  /**
   * default view (시스템 view) 의 visibility 변경 시도 시 호출. 호출자가
   * 사용자에게 fork 안내 (예: "새 view 로 저장하시겠어요?") + 새 view 로
   * 분기. 없으면 일반적인 visibility 토글 동작.
   */
  onHideRequestOnDefault?: (columnId: string) => void;
  /** 위 콜백을 활성화할지. true 면 컬럼 hide 시도 = onHideRequestOnDefault 호출. */
  defaultViewLocked?: boolean;
  /**
   * Controlled view state. 정의되면 internal state 대신 이 값 사용.
   * 호스트 앱이 view 시스템 (서버 저장 등) 통합 시.
   * filterPersistKey 와 동시 사용 ✗ — viewState 가 우선.
   */
  viewState?: ViewState;
  /** view state 변경 시 호출. 호스트가 view 영속화. */
  onViewStateChange?: (next: ViewState) => void;
  /**
   * 행 본문 클릭 시 호출. 상세 모달 띄우기용. cell 안의 button / input
   * 등은 본인 onClick 에서 e.stopPropagation() 해야 행 클릭 안 트리거.
   */
  onRowClick?: (row: TRow) => void;
  /**
   * 무한 스크롤 — viewport 가 마지막 행에서 loadMoreThreshold 안쪽에
   * 들어가면 호출. 호스트가 다음 페이지 fetch 후 data 에 append.
   * isLoadingMore 가 true 인 동안엔 추가 호출 ✗ (디바운스).
   * hasMore 가 false 면 더 이상 호출 ✗.
   */
  onLoadMore?: () => void;
  /** 다음 페이지가 더 있는지. false 면 onLoadMore 호출 안 됨. */
  hasMore?: boolean;
  /** 현재 추가 페이지 fetch 중인지. true 면 onLoadMore 추가 호출 ✗. */
  isLoadingMore?: boolean;
  /** 마지막 N 행 안쪽에 viewport 가 들어가면 onLoadMore 트리거. 기본 10. */
  loadMoreThreshold?: number;
  /**
   * 정렬을 서버에 위임. true 면 client-side row 정렬 비활성 — sorting state 는
   * 그대로 노출되지만 행 순서는 data prop 그대로 사용. 호스트가 sorting 변화
   * 감지 → query string 으로 서버 재요청 + 첫 페이지부터 다시 받기.
   * 무한 스크롤과 함께 쓸 때 필수 — 페이지마다 정렬 어긋남 방지.
   */
  manualSorting?: boolean;
  /**
   * 필터를 서버에 위임. true 면 client-side row 필터 비활성. 무한 스크롤 +
   * 필터 정확성 보장이 필요할 때.
   */
  manualFiltering?: boolean;
  /**
   * 서버 사이드 페이지네이션 시 전체 행 개수 — 컨트롤바 카운터에 표시.
   * 미정의 시 클라가 가진 data.length 사용 (page 단위만 보유한 경우 불정확).
   */
  totalCount?: number;
};

export function DataGrid<TRow extends Record<string, unknown>>(
  props: DataGridProps<TRow>,
) {
  const {
    data, columns, rowKey,
    height = 600, estimatedRowHeight = 32, headerHeight = 32,
    className, emptyText,
    onCellEdit, filterPersistKey,
    onHideRequestOnDefault, defaultViewLocked,
    viewState, onViewStateChange,
    onRowClick,
    onLoadMore, hasMore, isLoadingMore, loadMoreThreshold = 10,
    manualSorting, manualFiltering, totalCount,
  } = props;

  const isControlled = viewState !== undefined;

  // localStorage 복원 — viewState 미사용 (uncontrolled) + filterPersistKey 정의 시.
  const restored = useMemo(
    () => (!isControlled && filterPersistKey ? loadState(filterPersistKey) : null),
    [isControlled, filterPersistKey],
  );

  const [internalSorting, setInternalSorting] = useState<SortingState>(restored?.sorting ?? []);
  const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>(
    restored?.columnFilters ?? [],
  );
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>(
    restored?.columnVisibility ?? Object.fromEntries(
      columns.filter((c) => c.defaultVisible === false).map((c) => [c.id, false]),
    ),
  );
  const [internalColumnOrder, setInternalColumnOrder] = useState<ColumnOrderState>(
    restored?.columnOrder ?? [],
  );
  const [internalColumnSizing, setInternalColumnSizing] = useState<ColumnSizingState>(
    restored?.columnSizing ?? {},
  );

  // controlled 일 땐 viewState 우선, 아니면 internal.
  const sorting = isControlled ? viewState.sorting : internalSorting;
  const columnFilters = isControlled ? viewState.columnFilters : internalFilters;
  const columnVisibility = isControlled ? viewState.columnVisibility : internalVisibility;
  const columnOrder = isControlled
    ? (viewState.columnOrder ?? [])
    : internalColumnOrder;
  const columnSizing = isControlled
    ? (viewState.columnSizing ?? {})
    : internalColumnSizing;

  // 변경 핸들러 — controlled 면 onViewStateChange, 아니면 internal state.
  // TanStack Table 의 OnChangeFn<T> 는 (updater: T | ((prev: T) => T)) => void 시그니처라
  // value 와 함수 둘 다 처리.
  const setSorting = (next: SortingState | ((prev: SortingState) => SortingState)) => {
    const value = typeof next === "function" ? next(sorting) : next;
    if (isControlled) onViewStateChange?.({ ...viewState!, sorting: value });
    else setInternalSorting(value);
  };
  const setColumnFilters = (next: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
    const value = typeof next === "function" ? next(columnFilters) : next;
    if (isControlled) onViewStateChange?.({ ...viewState!, columnFilters: value });
    else setInternalFilters(value);
  };
  const setColumnVisibility = (next: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
    const value = typeof next === "function" ? next(columnVisibility) : next;
    if (isControlled) onViewStateChange?.({ ...viewState!, columnVisibility: value });
    else setInternalVisibility(value);
  };
  const setColumnOrder = (next: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => {
    const value = typeof next === "function" ? next(columnOrder) : next;
    if (isControlled) onViewStateChange?.({ ...viewState!, columnOrder: value });
    else setInternalColumnOrder(value);
  };
  const setColumnSizing = (next: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)) => {
    const value = typeof next === "function" ? next(columnSizing) : next;
    if (isControlled) onViewStateChange?.({ ...viewState!, columnSizing: value });
    else setInternalColumnSizing(value);
  };

  // popover state — 우클릭으로 띄우는 헤더 menu.
  const [popoverState, setPopoverState] = useState<{
    columnId: string;
    anchor: { x: number; y: number };
  } | null>(null);
  // 정렬 우선순위 패널 — 컨트롤바 "정렬" 버튼 클릭으로.
  const [sortPanelAnchor, setSortPanelAnchor] = useState<{ x: number; y: number } | null>(null);

  // state 변경 시 localStorage 동기화 — controlled 일 땐 호스트가 영속화하므로 skip.
  useEffect(() => {
    if (isControlled || !filterPersistKey) return;
    saveState(filterPersistKey, { sorting, columnFilters, columnVisibility, columnOrder, columnSizing });
  }, [isControlled, filterPersistKey, sorting, columnFilters, columnVisibility, columnOrder, columnSizing]);

  const tableColumns = useMemo<TSColumnDef<TRow>[]>(
    () => columns.map((c) => {
      const meta: AirgridMeta = {
        align: c.align,
        width: c.width,
        filterType: c.filterType,
        selectOptions: c.selectOptions,
      };
      const def: TSColumnDef<TRow> = {
        id: c.id,
        header: c.header,
        accessorKey: c.accessorKey,
        cell: buildCellRenderer(c, onCellEdit, rowKey),
        meta,
        enableSorting: c.sortable !== false,
        enableColumnFilter: !!c.filterType,
      };
      const filterFn = pickFilterFn(c.filterType);
      if (filterFn) def.filterFn = filterFn;
      return def;
    }),
    [columns, onCellEdit, rowKey],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, columnVisibility, columnOrder, columnSizing },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getRowId: (row) => String(row[rowKey]),
    getCoreRowModel: getCoreRowModel(),
    // manual* 일 땐 row model 단계 건너뛰어 호스트(서버) 가 보낸 순서·집합 유지.
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualSorting: !!manualSorting,
    manualFiltering: !!manualFiltering,
    enableMultiSort: true,
    isMultiSortEvent: (e) => (e as React.MouseEvent).shiftKey,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  // dnd-kit sensors — mouse 4px 임계값으로 클릭(정렬)과 드래그 분리.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 행 클릭 vs 더블클릭 구분. 단일 클릭은 ROW_CLICK_DELAY 후 onRowClick 발화 —
  // 그 사이에 같은 row 에 대한 두 번째 click 이 오면 (dblclick 시작 신호)
  // 타이머만 취소해 모달이 안 뜨게. 다른 row click 이면 기존 pending 즉시
  // 발화 후 새 row 로 timer 재설정.
  const ROW_CLICK_DELAY = 220;
  const rowClickPending = useRef<
    { rowId: string; timer: ReturnType<typeof setTimeout>; row: TRow } | null
  >(null);
  const handleRowClick = (row: TRow) => {
    if (!onRowClick) return;
    const id = String(row[rowKey]);
    const pending = rowClickPending.current;
    if (pending && pending.rowId === id) {
      // 같은 row 두 번째 click — dblclick 시작 신호, 모달 ✗.
      clearTimeout(pending.timer);
      rowClickPending.current = null;
      return;
    }
    if (pending) {
      // 다른 row 빠른 클릭 — 기존 pending 즉시 발화.
      clearTimeout(pending.timer);
      onRowClick(pending.row);
    }
    const timer = setTimeout(() => {
      rowClickPending.current = null;
      onRowClick(row);
    }, ROW_CLICK_DELAY);
    rowClickPending.current = { rowId: id, timer, row };
  };
  // dblclick (cell 에서 stopPropagation 안 한 경우) 도 timer 취소.
  const handleRowDoubleClick = () => {
    if (rowClickPending.current) {
      clearTimeout(rowClickPending.current.timer);
      rowClickPending.current = null;
    }
  };

  // 드래그 종료 → arrayMove 로 columnOrder 재계산.
  // baseline 합성 룰:
  //   1) 호스트가 영속한 columnOrder 가 우선 — 사용자 reorder 결과 보존.
  //   2) 그 후 추가된 컬럼 (예: 새 컬럼 정의가 코드에 들어왔는데 옛 columnOrder
  //      에는 없는 경우) 은 끝에 자동 보충. 이 보충이 없으면 그 컬럼은
  //      indexOf = -1 이 나와 reorder 자체가 안 됨.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const allIds = table.getAllLeafColumns().map((c) => c.id);
    const baseline = columnOrder.length > 0
      ? [...columnOrder, ...allIds.filter((id) => !columnOrder.includes(id))]
      : allIds;
    const oldIndex = baseline.indexOf(String(active.id));
    const newIndex = baseline.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(baseline, oldIndex, newIndex));
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  // 가변 행 높이 — measureElement 가 실제 DOM 높이 측정. 셀 안에서 줄바꿈
  // (e.g. 다중 라인 상품 목록) 하면 자동으로 행이 늘어남. 단일 라인 행은
  // estimateSize 그대로.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
    measureElement: (el) => el?.getBoundingClientRect().height ?? estimatedRowHeight,
  });

  // 무한 스크롤 — virtual items 의 마지막 인덱스가 (rows.length - threshold)
  // 이상이면 onLoadMore 호출. isLoadingMore / hasMore 로 중복·종료 처리.
  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    if (!onLoadMore || isLoadingMore || hasMore === false) return;
    if (virtualItems.length === 0) return;
    const lastVisibleIndex = virtualItems[virtualItems.length - 1].index;
    if (lastVisibleIndex >= rows.length - loadMoreThreshold) {
      onLoadMore();
    }
  }, [virtualItems, rows.length, onLoadMore, isLoadingMore, hasMore, loadMoreThreshold]);

  const visibleColumns = table.getVisibleLeafColumns();
  // 사용자가 드래그로 폭 조정한 컬럼은 columnSizing[id] (px) 우선,
  // 그 외엔 ColumnDef.width (CSS grid template), 둘 다 없으면 minmax fallback.
  const gridTemplateColumns = useMemo(
    () => visibleColumns
      .map((c) => {
        const sized = columnSizing[c.id];
        if (typeof sized === "number" && sized > 0) return `${sized}px`;
        return (c.columnDef.meta as AirgridMeta | undefined)?.width ?? "minmax(80px, 1fr)";
      })
      .join(" "),
    [visibleColumns, columnSizing],
  );

  // chip 클릭 또는 헤더 우클릭 → popover 좌표 set.
  const openPopover = (columnId: string, anchor: { x: number; y: number }) =>
    setPopoverState({ columnId, anchor });
  const closePopover = () => setPopoverState(null);

  const popoverColumn = popoverState ? table.getColumn(popoverState.columnId) : null;

  return (
    <div className={className}>
      <div style={controlsBarStyle}>
        <span style={{ fontSize: 11, color: "var(--airgrid-header-fg, #6b7280)" }}>
          {(() => {
            // totalCount 정의 시 — 무한 스크롤 부분 로드 여부 숨기고 전체만.
            // 셀러는 200개 단위 페이지네이션을 알 필요 없음.
            if (typeof totalCount === "number") {
              return `${totalCount}행`;
            }
            return rows.length === data.length
              ? `${data.length}행`
              : `${rows.length}/${data.length}행 (필터됨)`;
          })()}
          {isLoadingMore && (
            <span style={{ marginLeft: 8, color: "var(--airgrid-empty-fg, #9ca3af)" }}>
              · 더 불러오는 중…
            </span>
          )}
          <span style={{ marginLeft: 8, color: "var(--airgrid-empty-fg, #9ca3af)" }}>
            헤더 우클릭으로 필터·정렬
          </span>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={(e) => setSortPanelAnchor({ x: e.clientX - 240, y: e.clientY + 8 })}
            style={{
              fontSize: 11,
              padding: "3px 8px",
              border: "1px solid var(--airgrid-border, #e5e7eb)",
              background: sorting.length > 0 ? "var(--airgrid-active-bg, #eef2ff)" : "var(--airgrid-bg, #ffffff)",
              color: sorting.length > 0 ? "var(--airgrid-active-fg, #4338ca)" : "var(--airgrid-header-fg, #6b7280)",
              borderRadius: 4,
              cursor: "pointer",
            }}
            title="정렬 우선순위 (다중 정렬)"
          >
            ⇅ 정렬{sorting.length > 0 ? ` (${sorting.length})` : ""}
          </button>
          <HideColumnsMenu
            table={table}
            defaultViewLocked={defaultViewLocked}
            onHideRequest={onHideRequestOnDefault}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ ...containerStyle, height }}
        role="grid"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleColumns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              style={{
                ...headerRowStyle,
                gridTemplateColumns,
                minHeight: headerHeight,
              }}
              role="row"
            >
              {table.getHeaderGroups()[0]?.headers.map((h) => (
                <HeaderCell key={h.id} header={h} onContextMenu={openPopover} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {rows.length === 0 ? (
          <div style={emptyRowStyle}>
            {emptyText ?? (data.length === 0 ? "데이터 없음" : "조건에 맞는 행 없음")}
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((vRow) => {
              const row = rows[vRow.index];
              return (
                <div
                  key={row.id}
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  role="row"
                  onClick={onRowClick ? () => handleRowClick(row.original) : undefined}
                  onDoubleClick={onRowClick ? handleRowDoubleClick : undefined}
                  style={{
                    // height 명시 ✗ — 자연 높이를 measureElement 가 실측.
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    minHeight: estimatedRowHeight,
                    transform: `translateY(${vRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns,
                    borderBottom: "1px solid var(--airgrid-border-subtle, #eceef1)",
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                  data-airgrid-row
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as AirgridMeta | undefined;
                    return (
                      <div
                        key={cell.id}
                        role="gridcell"
                        style={{
                          ...cellStyle,
                          textAlign: meta?.align === "right" ? "right" : "left",
                          justifyContent: meta?.align === "right" ? "flex-end" : "flex-start",
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {popoverColumn && popoverState && (
        <HeaderFilterPopover
          column={popoverColumn}
          anchor={popoverState.anchor}
          onClose={closePopover}
          defaultViewLocked={defaultViewLocked}
          onHideRequest={onHideRequestOnDefault}
        />
      )}
      {sortPanelAnchor && (
        <SortPriorityPanel
          table={table}
          anchor={sortPanelAnchor}
          onClose={() => setSortPanelAnchor(null)}
        />
      )}
    </div>
  );
}

// 컬럼 정의에서 cell 렌더 함수 빌드.
//   - 사용자 cell(row) 정의 + editable ✗ → 그 함수
//   - editable + onCellEdit → EditableCell
//   - 둘 다 없음 → default: accessor 값을 string 으로 (null/undefined 는 빈 셀)
function buildCellRenderer<TRow extends Record<string, unknown>>(
  c: ColumnDef<TRow>,
  onCellEdit: ((rowId: string, columnId: string, value: unknown) => void) | undefined,
  rowKey: keyof TRow & string,
): (info: CellContext<TRow, unknown>) => ReactNode {
  if (c.cell && !c.editable) {
    return (info) => c.cell!(info.row.original);
  }
  if (c.editable && onCellEdit) {
    const inputType: "text" | "number" =
      c.filterType === "numberRange" ? "number" : "text";
    return (info) => (
      <EditableCell
        value={info.getValue()}
        inputType={inputType}
        align={c.align}
        display={c.cell ? c.cell(info.row.original) : undefined}
        onCommit={(next) => {
          const rowId = String(info.row.original[rowKey]);
          onCellEdit(rowId, c.id, next);
        }}
      />
    );
  }
  return (info) => {
    const v = info.getValue();
    if (v == null || v === "") return null;
    return String(v);
  };
}

// ─── 기본 스타일 ─────────────────────────────────────────────────

const controlsBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  marginBottom: 4,
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "auto",
  background: "var(--airgrid-bg, #ffffff)",
  border: "1px solid var(--airgrid-border, #e5e7eb)",
  borderRadius: 6,
  fontSize: 13,
};

const headerRowStyle: React.CSSProperties = {
  display: "grid",
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "var(--airgrid-header-bg, #f9fafb)",
  borderBottom: "1px solid var(--airgrid-border, #e5e7eb)",
};

const cellStyle: React.CSSProperties = {
  padding: "7px 10px",
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const emptyRowStyle: React.CSSProperties = {
  padding: 40,
  textAlign: "center",
  color: "var(--airgrid-empty-fg, #9ca3af)",
};
