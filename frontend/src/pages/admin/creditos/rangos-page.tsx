import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, BarChart2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { creditosService } from '@/features/creditos/services/creditos.service'
import { type RangoCredito } from '@/types'

const schema = z.object({
  productoId: z.number({ message: 'Selecciona un producto' }).min(1, 'Selecciona un producto'),
  tasaId: z.number().optional(),
  montoMin: z.number({ message: 'Monto mínimo inválido' }).min(0.01, 'Monto mínimo inválido'),
  montoMax: z.number({ message: 'Monto máximo inválido' }).min(0.01, 'Monto máximo inválido'),
  plazoMinMeses: z.number({ message: 'Mínimo 1 mes' }).min(1, 'Mínimo 1 mes'),
  plazoMaxMeses: z.number({ message: 'Mínimo 1 mes' }).min(1, 'Mínimo 1 mes'),
  descripcion: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function RangosPage() {
  const queryClient = useQueryClient()
  const [editingRango, setEditingRango] = useState<RangoCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProductoFilter, setSelectedProductoFilter] = useState<string>('all')

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-credito'],
    queryFn: () => creditosService.getProductos(),
  })

  const { data: tasas = [] } = useQuery({
    queryKey: ['tasas-credito'],
    queryFn: () => creditosService.getTasas(),
  })

  const { data: rangos = [], isLoading } = useQuery({
    queryKey: ['rangos-credito', selectedProductoFilter],
    queryFn: () =>
      creditosService.getRangos(
        selectedProductoFilter !== 'all' ? Number(selectedProductoFilter) : undefined,
      ),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      productoId: 0,
      tasaId: undefined,
      montoMin: 1000,
      montoMax: 5000,
      plazoMinMeses: 12,
      plazoMaxMeses: 36,
      descripcion: '',
    },
  })

  const currentProductoId = watch('productoId')
  const currentTasaId = watch('tasaId')

  const openCreateDialog = () => {
    setEditingRango(null)
    reset({
      productoId: productos[0]?.id ?? 0,
      tasaId: undefined,
      montoMin: 1000,
      montoMax: 5000,
      plazoMinMeses: 12,
      plazoMaxMeses: 36,
      descripcion: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: RangoCredito) => {
    setEditingRango(item)
    reset({
      productoId: item.productoId,
      tasaId: item.tasaId ?? undefined,
      montoMin: item.montoMin,
      montoMax: item.montoMax,
      plazoMinMeses: item.plazoMinMeses,
      plazoMaxMeses: item.plazoMaxMeses,
      descripcion: item.descripcion || '',
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        ...values,
        tasaId: values.tasaId && values.tasaId > 0 ? values.tasaId : undefined,
      }
      if (editingRango) {
        return creditosService.updateRango(editingRango.id, payload)
      }
      return creditosService.createRango(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rangos-credito'] })
      toast.success(editingRango ? 'Rango actualizado con éxito' : 'Rango creado con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar el rango'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleRango(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rangos-credito'] })
      toast.success('Estado del rango actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado del rango'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Rangos de Crédito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Segmenta los montos y plazos con tasas diferenciadas por producto
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rango
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Listado de Escalas y Rangos</CardTitle>
              <CardDescription>Escalonamiento de montos y plazos</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>Producto:</span>
              </div>
              <Select
                value={selectedProductoFilter}
                onValueChange={setSelectedProductoFilter}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos los productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los productos</SelectItem>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : rangos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron rangos de crédito configurados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Rango de Monto</TableHead>
                  <TableHead className="text-right">Rango de Plazo</TableHead>
                  <TableHead>Tasa Especial</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rangos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">
                      {item.productoNombre}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${Number(item.montoMin).toLocaleString()} - ${Number(item.montoMax).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.plazoMinMeses} a {item.plazoMaxMeses} meses
                    </TableCell>
                    <TableCell>
                      {item.tasaValor ? (
                        <Badge className="bg-emerald-600 font-mono">
                          {Number(item.tasaValor).toFixed(2)}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Tasa base producto</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {item.descripcion || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.activo ? 'default' : 'secondary'}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMutation.mutate(item.id)}
                          title={item.activo ? 'Desactivar' : 'Activar'}
                        >
                          {item.activo ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRango ? 'Editar Rango' : 'Nuevo Rango de Crédito'}</DialogTitle>
            <DialogDescription>
              Ajusta los límites de monto, plazos y tasa preferencial asignada.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values: FormData) => saveMutation.mutate(values))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>Producto de Crédito</Label>
              <Select
                value={String(currentProductoId || '')}
                onValueChange={(val) =>
                  setValue('productoId', Number(val), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productoId && (
                <p className="text-xs text-destructive">{errors.productoId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="montoMin">Monto Mínimo ($)</Label>
                <Input id="montoMin" type="number" step="0.01" {...register('montoMin', { valueAsNumber: true })} />
                {errors.montoMin && (
                  <p className="text-xs text-destructive">{errors.montoMin.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="montoMax">Monto Máximo ($)</Label>
                <Input id="montoMax" type="number" step="0.01" {...register('montoMax', { valueAsNumber: true })} />
                {errors.montoMax && (
                  <p className="text-xs text-destructive">{errors.montoMax.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plazoMinMeses">Plazo Mínimo (Meses)</Label>
                <Input id="plazoMinMeses" type="number" {...register('plazoMinMeses', { valueAsNumber: true })} />
                {errors.plazoMinMeses && (
                  <p className="text-xs text-destructive">{errors.plazoMinMeses.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plazoMaxMeses">Plazo Máximo (Meses)</Label>
                <Input id="plazoMaxMeses" type="number" {...register('plazoMaxMeses', { valueAsNumber: true })} />
                {errors.plazoMaxMeses && (
                  <p className="text-xs text-destructive">{errors.plazoMaxMeses.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tasa Específica para este Rango (Opcional)</Label>
              <Select
                value={currentTasaId ? String(currentTasaId) : '0'}
                onValueChange={(val) =>
                  setValue('tasaId', val === '0' ? undefined : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Usar tasa general del producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tasa por defecto del producto</SelectItem>
                  {tasas.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre || 'Tasa'} — {Number(t.valor).toFixed(2)}% ({t.tipoTasa})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={2}
                placeholder="Condiciones específicas de esta escala de crédito..."
                {...register('descripcion')}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting || saveMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando…' : editingRango ? 'Guardar cambios' : 'Crear rango'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
