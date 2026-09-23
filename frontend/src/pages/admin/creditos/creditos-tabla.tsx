import { CirclePlus, Pencil, Power } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'

export interface CreditoProducto {
  id: number
  nombre: string
  montoMin: number
  montoMax: number
  plazos: string
  tasas: string
  activo: boolean
}

const CREDITOS_INICIALES: CreditoProducto[] = [
  {
    id: 1,
    nombre: 'Crédito de Consumo Prioritario',
    montoMin: 500,
    montoMax: 3000,
    plazos: '12, 24, 36 meses',
    tasas: '14.00% – 16.77% · Desgravamen 0.06%',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Microcrédito Minorista',
    montoMin: 500,
    montoMax: 3000,
    plazos: '6, 12, 18, 24 meses',
    tasas: '20.00% – 28.23% · Desgravamen 0.08%',
    activo: true,
  },
  {
    id: 3,
    nombre: 'Crédito Productivo PYMES',
    montoMin: 10000,
    montoMax: 500000,
    plazos: '12, 24, 36, 48 meses',
    tasas: '9.50% – 11.83% · Desgravamen 0.03%',
    activo: false,
  },
]

export function CreditosAdminPage() {
  const navigate = useNavigate()
  const [creditos, setCreditos] = useState<CreditoProducto[]>(CREDITOS_INICIALES)

  const toggleEstado = (id: number) => {
    setCreditos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, activo: !item.activo } : item,
      ),
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Productos de crédito"
        description="Configura productos, plazos en meses, tasas de interés y seguro de desgravamen."
        actions={
          <Button onClick={() => navigate('/admin/creditos/nuevo')}>
            <CirclePlus />
            Nuevo producto
          </Button>
        }
      />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-4">Producto</th>
              <th className="p-4">Plazos</th>
              <th className="p-4">Tasas</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right" />
            </tr>
          </thead>
          <tbody>
            {creditos.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="p-4">
                  <strong>{item.nombre}</strong>
                  <span className="block text-xs text-muted-foreground">
                    {formatCurrency(item.montoMin)} – {formatCurrency(item.montoMax)}
                  </span>
                </td>
                <td className="p-4">{item.plazos}</td>
                <td className="p-4">{item.tasas}</td>
                <td className="p-4">
                  <StatusBadge tone={item.activo ? 'success' : 'neutral'}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </StatusBadge>
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/creditos/${item.id}/editar`)}
                  >
                    <Pencil />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEstado(item.id)}
                  >
                    <Power />
                    {item.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {creditos.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            Todavía no existen productos de crédito.
          </p>
        )}
      </div>
    </div>
  )
}
