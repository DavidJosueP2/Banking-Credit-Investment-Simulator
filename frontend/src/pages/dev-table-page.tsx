import { Archive, Eye, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  DataTableToolbar,
  createSelectionColumn,
  dataTableFeatures,
  type DataTableInstance,
} from '@/components/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatCurrency,
  formatDate,
  formatPercentage,
} from '@/lib/formatters'

type MockStatus = 'Activo' | 'Pendiente' | 'Inactivo'

interface MockRecord {
  id: string
  reference: string
  category: string
  amount: number
  rate: number
  status: MockStatus
  updatedAt: string
}

const mockData: MockRecord[] = [
  { id: 'mock-001', reference: 'Registro Andino', category: 'Configuración', amount: 1250, rate: 0.0825, status: 'Activo', updatedAt: '2026-09-02' },
  { id: 'mock-002', reference: 'Registro Pacífico', category: 'Validación', amount: 3420.5, rate: 0.091, status: 'Pendiente', updatedAt: '2026-09-03' },
  { id: 'mock-003', reference: 'Registro Central', category: 'Configuración', amount: 875, rate: 0.0775, status: 'Activo', updatedAt: '2026-09-05' },
  { id: 'mock-004', reference: 'Registro Sierra', category: 'Prueba', amount: 5180, rate: 0.105, status: 'Inactivo', updatedAt: '2026-09-06' },
  { id: 'mock-005', reference: 'Registro Costa', category: 'Validación', amount: 2295.75, rate: 0.089, status: 'Activo', updatedAt: '2026-09-07' },
  { id: 'mock-006', reference: 'Registro Austro', category: 'Prueba', amount: 1420, rate: 0.096, status: 'Pendiente', updatedAt: '2026-09-08' },
  { id: 'mock-007', reference: 'Registro Norte', category: 'Configuración', amount: 998.4, rate: 0.081, status: 'Activo', updatedAt: '2026-09-09' },
  { id: 'mock-008', reference: 'Registro Sur', category: 'Validación', amount: 7640, rate: 0.1125, status: 'Inactivo', updatedAt: '2026-09-10' },
  { id: 'mock-009', reference: 'Registro Delta', category: 'Prueba', amount: 3150, rate: 0.0875, status: 'Activo', updatedAt: '2026-09-11' },
  { id: 'mock-010', reference: 'Registro Atlas', category: 'Configuración', amount: 4625.9, rate: 0.093, status: 'Pendiente', updatedAt: '2026-09-12' },
  { id: 'mock-011', reference: 'Registro Horizonte', category: 'Validación', amount: 1890, rate: 0.0795, status: 'Activo', updatedAt: '2026-09-13' },
  { id: 'mock-012', reference: 'Registro Aurora', category: 'Prueba', amount: 2760, rate: 0.101, status: 'Inactivo', updatedAt: '2026-09-14' },
]

const columnHelper = createColumnHelper<typeof dataTableFeatures, MockRecord>()

const mockColumns = columnHelper.columns([
  createSelectionColumn<MockRecord>(),
  columnHelper.accessor('reference', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    meta: { label: 'Nombre' },
  }),
  columnHelper.accessor('category', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    meta: { label: 'Tipo' },
  }),
  columnHelper.accessor('amount', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monto" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatCurrency(getValue())}</span>
    ),
    meta: { label: 'Monto' },
  }),
  columnHelper.accessor('rate', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tasa" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatPercentage(getValue())}</span>
    ),
    meta: { label: 'Tasa' },
  }),
  columnHelper.accessor('status', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ getValue }) => {
      const status = getValue()
      const tone =
        status === 'Activo'
          ? 'success'
          : status === 'Pendiente'
            ? 'warning'
            : 'neutral'

      return <StatusBadge tone={tone}>{status}</StatusBadge>
    },
    filterFn: 'equalsString',
    meta: { label: 'Estado' },
  }),
  columnHelper.accessor('updatedAt', {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ getValue }) => formatDate(getValue()),
    meta: { label: 'Fecha' },
  }),
  columnHelper.display({
    id: 'actions',
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: 'Ver',
              icon: Eye,
              onSelect: (record) =>
                toast.info(`Vista mock: ${record.reference}`),
            },
            {
              label: 'Editar',
              icon: Pencil,
              onSelect: () => toast.info('Edición mock sin persistencia'),
            },
            {
              label: 'Desactivar',
              icon: Archive,
              destructive: true,
              separatorBefore: true,
              onSelect: () => toast.info('Acción mock sin persistencia'),
            },
          ]}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    meta: { label: 'Acciones' },
  }),
])

function MockStatusFilter({ table }: { table: DataTableInstance<MockRecord> }) {
  const column = table.getColumn('status')
  const value = (column?.getFilterValue() as string | undefined) ?? 'all'

  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        column?.setFilterValue(nextValue === 'all' ? undefined : nextValue)
      }
    >
      <SelectTrigger className="w-full sm:w-36" aria-label="Filtrar por estado">
        <SelectValue placeholder="Estado" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="Activo">Activo</SelectItem>
        <SelectItem value="Pendiente">Pendiente</SelectItem>
        <SelectItem value="Inactivo">Inactivo</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function DevTablePage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          title="Laboratorio de tabla"
          description="Vista interna para comprobar la infraestructura reutilizable. Todos los registros son datos mock locales y no se conectan al backend."
          actions={<Badge variant="outline">Datos mock</Badge>}
        />

        <DataTable
          columns={mockColumns}
          data={mockData}
          getRowId={(record) => record.id}
          search={{ columnId: 'reference', placeholder: 'Buscar por nombre...' }}
          pagination={{ mode: 'client', initialPageSize: 10 }}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              search={{
                columnId: 'reference',
                placeholder: 'Buscar por nombre...',
              }}
            >
              <MockStatusFilter table={table} />
            </DataTableToolbar>
          )}
          aria-label="Registros mock"
        />
      </div>
    </main>
  )
}
