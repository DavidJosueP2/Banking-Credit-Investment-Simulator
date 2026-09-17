import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance } from '@/components/data-table/data-table-features'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface DataTableSearchOptions {
  columnId: string
  placeholder?: string
}

interface DataTableToolbarProps<TData extends RowData> {
  table: DataTableInstance<TData>
  search?: DataTableSearchOptions
  children?: ReactNode
  actions?: ReactNode
}

export function DataTableToolbar<TData extends RowData>({
  table,
  search,
  children,
  actions,
}: DataTableToolbarProps<TData>) {
  const searchColumn = search ? table.getColumn(search.columnId) : undefined
  const isFiltered = table.state.columnFilters.length > 0

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {searchColumn && (
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={(searchColumn.getFilterValue() as string) ?? ''}
              onChange={(event) => searchColumn.setFilterValue(event.target.value)}
              placeholder={search?.placeholder ?? 'Buscar...'}
              className="pl-9"
              aria-label={search?.placeholder ?? 'Buscar registros'}
            />
          </div>
        )}
        {children}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Limpiar filtros
            <X />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
