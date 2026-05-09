// 필터 함수 — TanStack Table 의 column.filterFn 으로 등록.
//
// 필터 값 형태 (column.setFilterValue 로 설정):
//   text:        TextFilter 객체 또는 (legacy) string  → string 은 contains 로 자동 매핑
//   numberRange: NumberFilter 객체 또는 (legacy) { min, max }  → between 으로 자동 매핑
//   select:      string[]                              — any-of (빈 배열 = 모두)
//   boolean:     boolean | "any"                       — true / false / 모두

import type { FilterFn } from "@tanstack/react-table";
import type {
  TextFilter, TextFilterOp,
  NumberFilter, NumberFilterOp,
} from "./types";

// ─── 정규화 — legacy 문자열 / range 를 객체 형태로 변환 ─────────────

function normalizeText(raw: unknown): TextFilter | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    return raw.trim() === "" ? null : { op: "contains", value: raw };
  }
  if (typeof raw === "object") {
    const f = raw as TextFilter;
    return f;
  }
  return null;
}

function normalizeNumber(raw: unknown): NumberFilter | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const f = raw as NumberFilter;
  // op 미지정 + min/max 만 있는 legacy 객체 → between 으로.
  if (!f.op && (f.min != null || f.max != null)) {
    return { op: "between", min: f.min, max: f.max };
  }
  return f;
}

// 필터 유효 여부 — UI 의 "초기화" 버튼 / 헤더 dot indicator 가 사용.
export function isTextFilterActive(raw: unknown): boolean {
  const f = normalizeText(raw);
  if (!f) return false;
  if (f.op === "isEmpty" || f.op === "isNotEmpty") return true;
  return !!f.value && f.value.trim() !== "";
}

export function isNumberFilterActive(raw: unknown): boolean {
  const f = normalizeNumber(raw);
  if (!f) return false;
  if (f.op === "isEmpty" || f.op === "isNotEmpty") return true;
  if (f.op === "between") {
    return (typeof f.min === "number" && Number.isFinite(f.min))
      || (typeof f.max === "number" && Number.isFinite(f.max));
  }
  return typeof f.value === "number" && Number.isFinite(f.value);
}

// ─── filterFn 본체 ──────────────────────────────────────────────

// 모든 컬럼 row 타입에 호환되도록 any. row.getValue() 만 사용해 row 형태에
// 의존 ✗ — runtime 안전.
export const textFilter: FilterFn<any> = (row, columnId, raw) => {
  const f = normalizeText(raw);
  if (!f || !isTextFilterActive(raw)) return true;
  const v = row.getValue(columnId);
  const cellEmpty = v == null || String(v).trim() === "";
  const op: TextFilterOp = f.op ?? "contains";
  if (op === "isEmpty") return cellEmpty;
  if (op === "isNotEmpty") return !cellEmpty;
  if (cellEmpty) return false;
  const haystack = String(v).toLowerCase();
  const needle = (f.value ?? "").trim().toLowerCase();
  switch (op) {
    case "is":          return haystack === needle;
    case "isNot":       return haystack !== needle;
    case "notContains": return !haystack.includes(needle);
    case "startsWith":  return haystack.startsWith(needle);
    case "endsWith":    return haystack.endsWith(needle);
    case "contains":
    default:            return haystack.includes(needle);
  }
};

export const numberRangeFilter: FilterFn<any> = (row, columnId, raw) => {
  const f = normalizeNumber(raw);
  if (!f || !isNumberFilterActive(raw)) return true;
  const rawV = row.getValue(columnId);
  const cellEmpty = rawV == null || rawV === "";
  const op: NumberFilterOp = f.op ?? "between";
  if (op === "isEmpty") return cellEmpty;
  if (op === "isNotEmpty") return !cellEmpty;
  if (cellEmpty) return false;
  const n = typeof rawV === "number" ? rawV : Number(rawV);
  if (!Number.isFinite(n)) return false;
  if (op === "between") {
    if (f.min != null && n < f.min) return false;
    if (f.max != null && n > f.max) return false;
    return true;
  }
  if (f.value == null || !Number.isFinite(f.value)) return true;
  switch (op) {
    case "eq":  return n === f.value;
    case "neq": return n !== f.value;
    case "lt":  return n <  f.value;
    case "gt":  return n >  f.value;
    case "lte": return n <= f.value;
    case "gte": return n >= f.value;
  }
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
