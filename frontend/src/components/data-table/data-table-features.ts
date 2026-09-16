import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_equalsString,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  filterFn_weakEquals,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type ReactTable,
} from '@tanstack/react-table'

export interface DataTableColumnMeta {
  label?: string
}

export const dataTableFeatures = tableFeatures({
  columnMeta: {} as DataTableColumnMeta,
  columnFilteringFeature,
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    equalsString: filterFn_equalsString,
    inDateRange: filterFn_inDateRange,
    inNumberRange: filterFn_inNumberRange,
    includesString: filterFn_includesString,
    weakEquals: filterFn_weakEquals,
  },
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
  rowSelectionFeature,
})

export type DataTableColumnDef<TData> = ColumnDef<
  typeof dataTableFeatures,
  TData
>

export type DataTableInstance<TData> = ReactTable<
  typeof dataTableFeatures,
  TData
>
