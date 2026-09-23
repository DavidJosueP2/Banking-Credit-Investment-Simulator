import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type RowData,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { useState, type ReactNode } from 'react'

import {
  dataTableFeatures,
  type DataTableColumnDef,
  type DataTableInstance,
} from '@/components/data-table/data-table-features'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import {
  DataTableToolbar,
  type DataTableSearchOptions,
} from '@/components/data-table/data-table-toolbar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface DataTableClientPaginationOptions {
  mode?: 'client'
  initialPageSize?: number
}

export interface DataTableServerPaginationOptions {
  mode: 'server'
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>
  rowCount: number
  pageCount?: number
}

export type DataTablePaginationOptions =
  | DataTableClientPaginationOptions
  | DataTableServerPaginationOptions

export interface DataTableSelectionOptions {
  state: RowSelectionState
  onChange: OnChangeFn<RowSelectionState>
}

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[]
  data: TData[]
  getRowId?: (record: TData, index: number) => string
  isLoading?: boolean
  emptyMessage?: string
  search?: DataTableSearchOptions
  toolbar?: (table: DataTableInstance<TData>) => ReactNode
  pagination?: DataTablePaginationOptions | false
  pageSizeOptions?: number[]
  selection?: DataTableSelectionOptions
  enableRowSelection?: boolean
  'aria-label'?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyMessage = 'No se encontraron resultados.',
  search,
  toolbar,
  pagination: paginationOptions = { mode: 'client' },
  pageSizeOptions = [10, 20, 30, 50, 100],
  selection,
  enableRowSelection = true,
  'aria-label': ariaLabel = 'Tabla de datos',
}: DataTableProps<TData>) {
  const serverOptions =
    paginationOptions && paginationOptions.mode === 'server'
      ? paginationOptions
      : undefined
  const initialPageSize =
    paginationOptions === false
      ? Infinity
      : paginationOptions.mode !== 'server'
      ? (paginationOptions.initialPageSize ?? 10)
      : 10

  const [clientPagination, setClientPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })
  const [clientSorting, setClientSorting] = useState<SortingState>([])
  const [clientColumnFilters, setClientColumnFilters] =
    useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({})
  const [localRowSelection, setLocalRowSelection] =
    useState<RowSelectionState>({})

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: {
      pagination: serverOptions?.pagination ?? clientPagination,
      sorting: serverOptions?.sorting ?? clientSorting,
      columnFilters: serverOptions?.columnFilters ?? clientColumnFilters,
      columnVisibility,
      rowSelection: selection?.state ?? localRowSelection,
    },
    onPaginationChange:
      serverOptions?.onPaginationChange ?? setClientPagination,
    onSortingChange: serverOptions?.onSortingChange ?? setClientSorting,
    onColumnFiltersChange:
      serverOptions?.onColumnFiltersChange ?? setClientColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: selection?.onChange ?? setLocalRowSelection,
    enableRowSelection,
    manualPagination: Boolean(serverOptions),
    manualSorting: Boolean(serverOptions),
    manualFiltering: Boolean(serverOptions),
    rowCount: serverOptions?.rowCount,
    pageCount: serverOptions?.pageCount,
  })

  return (
    <div className="space-y-4">
      {toolbar ? toolbar(table) : <DataTableToolbar table={table} search={search} />}

      {isLoading ? (
        <DataTableSkeleton
          columnCount={Math.max(table.getVisibleLeafColumns().length, 1)}
          rowCount={Math.min(table.state.pagination.pageSize, 10)}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table aria-label={ariaLabel}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    if (header.rowSpan === 0) {
                      return null
                    }

                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        rowSpan={header.rowSpan}
                      >
                        {header.isPlaceholder ? null : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {paginationOptions !== false && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  )
}

export function createSelectionColumn<TData extends RowData>(): DataTableColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) =>
          table.toggleAllPageRowsSelected(Boolean(value))
        }
        aria-label="Seleccionar todas las filas de la página"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        aria-label="Seleccionar fila"
      />
    ),
    enableHiding: false,
    enableSorting: false,
    meta: { label: 'Selección' },
  }
}
