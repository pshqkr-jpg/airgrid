// airgrid public API.

export { DataGrid, type DataGridProps } from "./DataGrid";
export type {
  ColumnDef,
  FilterType,
  AirgridMeta,
  ViewState,
  TextFilter,
  TextFilterOp,
  NumberFilter,
  NumberFilterOp,
} from "./types";
export { EMPTY_VIEW_STATE } from "./types";
export { clearState as clearPersistedState } from "./persistence";

export const VERSION = "0.8.4";
