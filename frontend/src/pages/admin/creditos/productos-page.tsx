import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, Package, Filter, ShieldAlert } from 'lucide-react'
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
import { type ProductoCredito } from '@/types'

const schema = z.object({
  tipoCreditoId: z.number({ message: 'Selecciona un tipo de crédito' }).min(1, 'Selecciona un tipo de crédito'),
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  descripcion: z.string().optional(),
  plazoMinMeses: z.number({ message: 'Mínimo 1 mes' }).min(1, 'Mínimo 1 mes'),
  plazoMaxMeses: z.number({ message: 'Mínimo 1 mes' }).min(1, 'Mínimo 1 mes'),
  montoMin: z.number({ message: 'Monto mínimo inválido' }).min(1, 'Monto mínimo inválido'),
  montoMax: z.number({ message: 'Monto máximo inválido' }).min(1, 'Monto máximo inválido'),
  requiereGarante: z.boolean(),
  imagenUrl: z.string().optional(),
  orden: z.number({ message: 'El orden debe ser numérico' }).min(0),
})

type FormData = z.infer<typeof schema>

export function ProductosPage() {
  const queryClient = useQueryClient()
  const [editingProducto, setEditingProducto] = useState<ProductoCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('all')

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-credito'],
    queryFn: () => creditosService.getTipos(),
  })

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos-credito', selectedTipoFilter],
    queryFn: () =>
      creditosService.getProductos(
        selectedTipoFilter !== 'all' ? Number(selectedTipoFilter) : undefined,
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
      tipoCreditoId: 0,
      nombre: '',
      descripcion: '',
      plazoMinMeses: 6,
      plazoMaxMeses: 60,
      montoMin: 500,
      montoMax: 20000,
      requiereGarante: false,
      imagenUrl: '',
      orden: 0,
    },
  })

  const currentTipoCreditoId = watch('tipoCreditoId')
  const currentRequiereGarante = watch('requiereGarante')

  const openCreateDialog = () => {
    setEditingProducto(null)
    reset({
      tipoCreditoId: tipos[0]?.id ?? 0,
      nombre: '',
      descripcion: '',
      plazoMinMeses: 6,
      plazoMaxMeses: 60,
      montoMin: 500,
      montoMax: 20000,
      requiereGarante: false,
      imagenUrl: '',
      orden: (productos.length + 1) * 10,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: ProductoCredito) => {
    setEditingProducto(item)
    reset({
      tipoCreditoId: item.tipoCreditoId,
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      plazoMinMeses: item.plazoMinMeses,
      plazoMaxMeses: item.plazoMaxMeses,
      montoMin: item.montoMin,
      montoMax: item.montoMax,
      requiereGarante: item.requiereGarante,
      imagenUrl: item.imagenUrl || '',
      orden: item.orden,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editingProducto) {
        return creditosService.updateProducto(editingProducto.id, values)
      }
      return creditosService.createProducto(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-credito'] })
      toast.success(editingProducto ? 'Producto actualizado con éxito' : 'Producto creado con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar el producto'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleProducto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-credito'] })
      toast.success('Estado del producto actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado del producto'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Productos de Crédito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura los productos comerciales, montos y límites de plazos
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Catálogo de Productos</CardTitle>
              <CardDescription>Parámetros comerciales y de riesgo</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>Tipo:</span>
              </div>
              <Select
                value={selectedTipoFilter}
                onValueChange={setSelectedTipoFilter}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre} ({t.segmentoNombre})
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
          ) : productos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron productos de crédito.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo / Segmento</TableHead>
                  <TableHead className="text-right">Montos (Min - Max)</TableHead>
                  <TableHead className="text-right">Plazos (Meses)</TableHead>
                  <TableHead className="text-center">Garante</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{item.nombre}</div>
                      {item.descripcion && (
                        <div className="text-xs text-muted-foreground max-w-xs truncate">
                          {item.descripcion}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.tipoCreditoNombre}</div>
                      <div className="text-xs text-muted-foreground">{item.segmentoNombre}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${item.montoMin.toLocaleString()} - ${item.montoMax.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.plazoMinMeses} a {item.plazoMaxMeses}m
                    </TableCell>
                    <TableCell className="text-center">
                      {item.requiereGarante ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          Requerido
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
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
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProducto ? 'Editar Producto de Crédito' : 'Nuevo Producto de Crédito'}
            </DialogTitle>
            <DialogDescription>
              Define las condiciones de financiamiento y límites de este producto.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values: FormData) => saveMutation.mutate(values))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>Tipo de Crédito</Label>
              <Select
                value={String(currentTipoCreditoId || '')}
                onValueChange={(val) =>
                  setValue('tipoCreditoId', Number(val), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre} — {t.segmentoNombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipoCreditoId && (
                <p className="text-xs text-destructive">{errors.tipoCreditoId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5 col-span-3">
                <Label htmlFor="nombre">Nombre Comercial</Label>
                <Input id="nombre" placeholder="Ej. Crédito Fácil Vehicular" {...register('nombre')} />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre.message}</p>
                )}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="orden">Orden</Label>
                <Input id="orden" type="number" {...register('orden', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={2}
                placeholder="Beneficios, requisitos generales y público objetivo..."
                {...register('descripcion')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border rounded-md p-3 bg-muted/20">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="text-sm font-medium">¿Requiere Garante Personal?</div>
                  <div className="text-xs text-muted-foreground">
                    Exige información y firma de garante para la solicitud
                  </div>
                </div>
                <Button
                  type="button"
                  variant={currentRequiereGarante ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setValue('requiereGarante', !currentRequiereGarante)}
                >
                  {currentRequiereGarante ? 'Sí, requerido' : 'No requerido'}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="imagenUrl">URL de Imagen Ilustrativa (Opcional)</Label>
                <Input id="imagenUrl" placeholder="https://..." {...register('imagenUrl')} />
              </div>
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
                {saveMutation.isPending ? 'Guardando…' : editingProducto ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
