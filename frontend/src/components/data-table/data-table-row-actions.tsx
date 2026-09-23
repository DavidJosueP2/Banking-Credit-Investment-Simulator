import { MoreHorizontal, type LucideIcon } from 'lucide-react'

import {
  dataTableFeatures,
  type DataTableColumnDef,
} from '@/components/data-table/data-table-features'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Row, RowData } from '@tanstack/react-table'

export interface DataTableRowAction<TData extends RowData> {
  label: string
  onSelect: (record: TData) => void
  icon?: LucideIcon
  destructive?: boolean
  separatorBefore?: boolean
  disabled?: boolean
}

interface DataTableRowActionsProps<TData extends RowData> {
  row: Row<typeof dataTableFeatures, TData>
  actions: DataTableRowAction<TData>[]
  label?: string
}

export function DataTableRowActions<TData extends RowData>({
  row,
  actions,
  label = 'Acciones del registro',
}: DataTableRowActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal />
          <span className="sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <div key={action.label}>
              {action.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.destructive ? 'destructive' : 'default'}
                disabled={action.disabled}
                onSelect={() => action.onSelect(row.original)}
              >
                {Icon && <Icon />}
                {action.label}
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function createRowActionsColumn<TData extends RowData>(
  getActions: (record: TData) => DataTableRowAction<TData>[],
): DataTableColumnDef<TData> {
  return {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DataTableRowActions row={row} actions={getActions(row.original)} />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    meta: { label: 'Acciones' },
  }
}
