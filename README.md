# airgrid

Airtable-style data grid for React. Built on TanStack Table + Virtual.

Designed for B2B SaaS list pages where the user needs:

- Per-column filters (text contains, number range, select, boolean)
- Sort + multi-sort
- Hide / show columns
- Virtualized rendering (5,000+ rows OK)
- Inline cell editing
- Persisted views (localStorage)
- Headless UI (you own the styling)

## Install

```bash
npm install github:pshqkr-jpg/airgrid
```

Peer dependencies your host app must already provide:

```
react >= 18
react-dom >= 18
@tanstack/react-table ^8
@tanstack/react-virtual ^3
```

## Usage (sketch)

```tsx
import { DataGrid, type ColumnDef } from "airgrid";

const columns: ColumnDef<Sku>[] = [
  { id: "code",         header: "코드",     accessorKey: "sku_code" },
  { id: "product_name", header: "상품명",   accessorKey: "product_name" },
  { id: "on_hand",      header: "실재고",   accessorKey: "on_hand", filterType: "numberRange" },
  { id: "memo",         header: "메모",     accessorKey: "memo",    editable: true },
];

<DataGrid
  data={skus}
  columns={columns}
  filterPersistKey="stock-inventory"
  onCellEdit={(rowId, columnId, value) => patchSku(rowId, { [columnId]: value })}
/>
```

## Status

Pre-1.0. Used by `wilogis` (한국 의류 셀러 OMS) and `winipic` projects.

## License

MIT
