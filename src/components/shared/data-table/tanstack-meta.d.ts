import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- generic names must match the upstream declaration
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Numeric/money column: `text-end font-mono tabular-nums` (constitution, Design System › الجداول). */
    numeric?: boolean;
    /** Server ordering key (DRF `ordering`); the header becomes a sort toggle when set. */
    sortKey?: string;
    /** Extra classes for both the header and the cells of this column. */
    className?: string;
    /** Visually hidden header label (selection/actions columns). */
    srOnlyHeader?: boolean;
  }
}
