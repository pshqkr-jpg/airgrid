// 공유 타입.

import type { ReactNode } from "react";

export type FilterType =
  | "text"          // contains (case-insensitive)
  | "numberRange"   // min / max
  | "select"        // multi-select (any-of)
  | "boolean";

export type ColumnDef<TRow> = {
  id: string;
  header: string;
  accessorKey: keyof TRow & string;
  /** 필터 타입. 없으면 컬럼 필터 ✗. */
  filterType?: FilterType;
  /** filterType="select" 일 때의 옵션 list. 없으면 데이터에서 자동 추출. */
  selectOptions?: string[];
  /** 인라인 편집 가능 여부. true 면 cell 이 input. */
  editable?: boolean;
  /** 셀 커스텀 렌더. 없으면 raw value. */
  cell?: (row: TRow) => ReactNode;
  /** 헤더 우측 정렬 여부 (숫자 컬럼 등). */
  align?: "left" | "right";
  /** 기본 표시 여부. false 면 hide 메뉴에서 활성화 시까지 안 보임. */
  defaultVisible?: boolean;
  /** CSS grid template column value. e.g. "minmax(120px, 1fr)" */
  width?: string;
  /** 정렬 가능 여부. 기본 true. */
  sortable?: boolean;
};

/** TanStack Table column.meta 에 박는 airgrid 메타 정보. */
export type AirgridMeta = {
  align?: "left" | "right";
  width?: string;
  filterType?: FilterType;
  selectOptions?: string[];
};
