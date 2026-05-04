// 필터 함수 — TanStack Table 의 column.filterFn 으로 등록.
//
// 필터 값 형태 (column.setFilterValue 로 설정):
//   text:        string                       — contains, case-insensitive
//   numberRange: { min?: number; max?: number }
//   select:      string[]                     — any-of (빈 배열 = 모두)
//   boolean:     boolean | "any"              — true / false / 모두

import type { FilterFn } from "@tanstack/react-table";

// 모든 컬럼 row 타입에 호환되도록 any. row.getValue() 만 사용해 row 형태에
// 의존 ✗ — runtime 안전.
export const textFilter: FilterFn<any> = (row, columnId, filterValue) => {
  // 공백만 있는 값은 "필터 없음" 으로 — 사용자가 실수로 스페이스 한 번
  // 누른 stale state 가 점 indicator 만 띄우는 일 방지.
  if (typeof filterValue !== "string" || filterValue.trim() === "") return true;
  const needle = filterValue.trim().toLowerCase();
  const v = row.getValue(columnId);
  if (v == null) return false;
  return String(v).toLowerCase().includes(needle);
};

export const numberRangeFilter: FilterFn<any> = (row, columnId, filterValue) => {
  if (!filterValue || typeof filterValue !== "object") return true;
  const { min, max } = filterValue as { min?: number; max?: number };
  if (min == null && max == null) return true;
  const raw = row.getValue(columnId);
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return false;
  if (min != null && n < min) return false;
  if (max != null && n > max) return false;
  return true;
};

export const selectFilter: FilterFn<any> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
  const v = row.getValue(columnId);
  return filterValue.includes(String(v ?? ""));
};

export const booleanFilter: FilterFn<any> = (row, columnId, filterValue) => {
  if (filterValue === "any" || filterValue == null) return true;
  return row.getValue(columnId) === filterValue;
};

export function pickFilterFn(filterType: string | undefined): FilterFn<any> | undefined {
  switch (filterType) {
    case "text":        return textFilter;
    case "numberRange": return numberRangeFilter;
    case "select":      return selectFilter;
    case "boolean":     return booleanFilter;
    default:            return undefined;
  }
}
