// 공유 타입. Step B 이후 확장 (필터 종류, edit 핸들러 등).

import type { ReactNode } from "react";

export type FilterType =
  | "text"          // contains (case-insensitive)
  | "numberRange"   // min / max
  | "select"        // multi-select
  | "boolean";

export type ColumnDef<TRow> = {
  id: string;
  header: string;
  accessorKey: keyof TRow & string;
  /** 필터 타입. 없으면 컬럼은 필터 ✗. */
  filterType?: FilterType;
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
};
