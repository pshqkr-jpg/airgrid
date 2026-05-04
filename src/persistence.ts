// localStorage 기반 view persistence — sorting + columnFilters + columnVisibility.
//
// SSR / 첫 마운트에서 안전하게 localStorage 접근. 키 namespacing 으로 같은
// 도메인의 여러 grid 가 서로 덮어쓰지 않게.

import type {
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";

export type PersistedState = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
};

const PREFIX = "airgrid:";

export function loadState(key: string): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      sorting: parsed.sorting ?? [],
      columnFilters: parsed.columnFilters ?? [],
      columnVisibility: parsed.columnVisibility ?? {},
    };
  } catch {
    return null;
  }
}

export function saveState(key: string, state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(state));
  } catch {
    // quota exceeded / storage disabled — silent
  }
}

export function clearState(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
