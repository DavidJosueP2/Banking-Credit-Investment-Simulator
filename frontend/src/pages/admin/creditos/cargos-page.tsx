import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, DollarSign, Filter } from 'lucide-react'
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
import { type CargoCredito, type TipoCargo } from '@/types'

const schema = z.object({
  productoId: z.number({ message: 'Selecciona un producto' }).min(1, 'Selecciona un producto'),
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  tipoCargo: z.enum(['FIJO', 'PORCENTAJE']),
  valor: z.number({ message: 'Valor inválido' }).min(0, 'El valor no puede ser negativo'),
  obligatorio: z.boolean(),
  descripcion: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CargosPage() {
  const queryClient = useQueryClient()
  const [editingCargo, setEditingCargo] = useState<CargoCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProductoFilter, setSelectedProductoFilter] = useState<string>('all')

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-credito'],
    queryFn: () => creditosService.getProductos(),
  })

  const { data: cargos = [], isLoading } = useQuery({
    queryKey: ['cargos-credito', selectedProductoFilter],
    queryFn: () =>
      creditosService.getCargos(
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
      nombre: '',
      tipoCargo: 'FIJO',
      valor: 0,
      obligatorio: true,
      descripcion: '',
    },
  })

  const currentProductoId = watch('productoId')
  const currentTipoCargo = watch('tipoCargo')
  const currentObligatorio = watch('obligatorio')

  const openCreateDialog = () => {
    setEditingCargo(null)
    reset({
      productoId: productos[0]?.id ?? 0,
      nombre: '',
      tipoCargo: 'FIJO',
      valor: 5.0,
      obligatorio: true,
      descripcion: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: CargoCredito) => {
    setEditingCargo(item)
    reset({
      productoId: item.productoId,
      nombre: item.nombre,
      tipoCargo: item.tipoCargo,
      valor: item.valor,
      obligatorio: item.obligatorio,
      descripcion: item.descripcion || '',
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editingCargo) {
        return creditosService.updateCargo(editingCargo.id, values)
      }
      return creditosService.createCargo(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos-credito'] })
      toast.success(editingCargo ? 'Cargo actualizado con éxito' : 'Cargo creado con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar el cargo'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleCargo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos-credito'] })
      toast.success('Estado del cargo actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado del cargo'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Cargos y Comisiones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administra los cobros fijos y porcentuales (gastos administrativos, análisis, etc.)
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cargo
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Listado de Cargos y Comisiones</CardTitle>
              <CardDescription>Cargos aplicados al desembolso o distribución por cuota</CardDescription>
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
          ) : cargos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron cargos de crédito registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Nombre del Cargo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Obligatorio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">
                      {item.productoNombre}
                    </TableCell>
                    <TableCell className="font-semibold">{item.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.tipoCargo === 'FIJO' ? 'Monto Fijo' : 'Porcentual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm">
                      {item.tipoCargo === 'FIJO'
                        ? `$${Number(item.valor).toFixed(2)}`
                        : `${Number(item.valor).toFixed(2)}%`}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.obligatorio ? (
                        <Badge variant="secondary">Sí</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Opcional</span>
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingCargo ? 'Editar Cargo' : 'Nuevo Cargo de Crédito'}</DialogTitle>
            <DialogDescription>
              Configura el monto o porcentaje aplicable a los créditos otorgados.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values: FormData) => saveMutation.mutate(values))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>Producto Asociado</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del Cargo</Label>
              <Input
                id="nombre"
                placeholder="Ej. Gastos Operativos de Solicitud"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Cobro</Label>
                <Select
                  value={currentTipoCargo}
                  onValueChange={(val: TipoCargo) =>
                    setValue('tipoCargo', val, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Fijo ($ USD)</SelectItem>
                    <SelectItem value="PORCENTAJE">Porcentual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valor">
                  {currentTipoCargo === 'FIJO' ? 'Monto ($ USD)' : 'Porcentaje (%)'}
                </Label>
                <Input id="valor" type="number" step="0.01" {...register('valor', { valueAsNumber: true })} />
                {errors.valor && (
                  <p className="text-xs text-destructive">{errors.valor.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="text-sm font-medium">¿Es un cargo obligatorio?</div>
                <div className="text-xs text-muted-foreground">
                  Se cobra automáticamente en cualquier liquidación
                </div>
              </div>
              <Button
                type="button"
                variant={currentObligatorio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setValue('obligatorio', !currentObligatorio)}
              >
                {currentObligatorio ? 'Sí, obligatorio' : 'Opcional'}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={2}
                placeholder="Explicación del cargo o base legal..."
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
                {saveMutation.isPending ? 'Guardando…' : editingCargo ? 'Guardar cambios' : 'Crear cargo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
