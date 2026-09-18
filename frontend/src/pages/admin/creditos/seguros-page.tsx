import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, Shield, Filter } from 'lucide-react'
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
import { type SeguroCredito, type TipoSeguro } from '@/types'

const TIPOS_SEGURO: { value: TipoSeguro; label: string }[] = [
  { value: 'DESGRAVAMEN', label: 'Desgravamen' },
  { value: 'INCENDIO', label: 'Incendio y Terremoto' },
  { value: 'ROBO', label: 'Robo y Asalto' },
  { value: 'VIDA', label: 'Vida Individual' },
  { value: 'OTRO', label: 'Otro Seguro' },
]

const schema = z.object({
  productoId: z.number({ message: 'Selecciona un producto' }).min(1, 'Selecciona un producto'),
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  tipoSeguro: z.enum(['DESGRAVAMEN', 'INCENDIO', 'ROBO', 'VIDA', 'OTRO']),
  valorPorcentaje: z.number({ message: 'Porcentaje inválido' }).min(0, 'El porcentaje no puede ser negativo').max(100),
  obligatorio: z.boolean(),
  descripcion: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function SegurosPage() {
  const queryClient = useQueryClient()
  const [editingSeguro, setEditingSeguro] = useState<SeguroCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProductoFilter, setSelectedProductoFilter] = useState<string>('all')

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-credito'],
    queryFn: () => creditosService.getProductos(),
  })

  const { data: seguros = [], isLoading } = useQuery({
    queryKey: ['seguros-credito', selectedProductoFilter],
    queryFn: () =>
      creditosService.getSeguros(
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
      tipoSeguro: 'DESGRAVAMEN',
      valorPorcentaje: 0.05,
      obligatorio: true,
      descripcion: '',
    },
  })

  const currentProductoId = watch('productoId')
  const currentTipoSeguro = watch('tipoSeguro')
  const currentObligatorio = watch('obligatorio')

  const openCreateDialog = () => {
    setEditingSeguro(null)
    reset({
      productoId: productos[0]?.id ?? 0,
      nombre: '',
      tipoSeguro: 'DESGRAVAMEN',
      valorPorcentaje: 0.05,
      obligatorio: true,
      descripcion: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: SeguroCredito) => {
    setEditingSeguro(item)
    reset({
      productoId: item.productoId,
      nombre: item.nombre,
      tipoSeguro: item.tipoSeguro,
      valorPorcentaje: item.valorPorcentaje,
      obligatorio: item.obligatorio,
      descripcion: item.descripcion || '',
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editingSeguro) {
        return creditosService.updateSeguro(editingSeguro.id, values)
      }
      return creditosService.createSeguro(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros-credito'] })
      toast.success(editingSeguro ? 'Seguro actualizado con éxito' : 'Seguro creado con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar el seguro'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleSeguro(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros-credito'] })
      toast.success('Estado del seguro actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado del seguro'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Pólizas y Seguros de Crédito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los seguros vinculados a la cartera de créditos (desgravamen, incendios, etc.)
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Seguro
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Listado de Seguros Asociados</CardTitle>
              <CardDescription>Pólizas protectoras sobre saldo o activos en garantía</CardDescription>
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
          ) : seguros.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron seguros de crédito registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Póliza / Seguro</TableHead>
                  <TableHead>Tipo Cobertura</TableHead>
                  <TableHead className="text-right">Porcentaje (%)</TableHead>
                  <TableHead className="text-center">Obligatorio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seguros.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">
                      {item.productoNombre}
                    </TableCell>
                    <TableCell className="font-semibold">{item.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.tipoSeguro}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm text-primary">
                      {Number(item.valorPorcentaje).toFixed(4)}%
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
            <DialogTitle>{editingSeguro ? 'Editar Seguro' : 'Nuevo Seguro de Crédito'}</DialogTitle>
            <DialogDescription>
              Configura los parámetros de la póliza de seguro aplicable a la cuota o saldo.
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
              <Label htmlFor="nombre">Nombre de la Póliza</Label>
              <Input
                id="nombre"
                placeholder="Ej. Seguro de Desgravamen Individual"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Seguro</Label>
                <Select
                  value={currentTipoSeguro}
                  onValueChange={(val: TipoSeguro) =>
                    setValue('tipoSeguro', val, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SEGURO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valorPorcentaje">Porcentaje (%)</Label>
                <Input
                  id="valorPorcentaje"
                  type="number"
                  step="0.0001"
                  placeholder="0.05"
                  {...register('valorPorcentaje', { valueAsNumber: true })}
                />
                {errors.valorPorcentaje && (
                  <p className="text-xs text-destructive">{errors.valorPorcentaje.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="text-sm font-medium">¿Es un seguro obligatorio?</div>
                <div className="text-xs text-muted-foreground">
                  Se adiciona de forma obligatoria en la simulación
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
                placeholder="Detalles de aseguradora o cobertura..."
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
                {saveMutation.isPending ? 'Guardando…' : editingSeguro ? 'Guardar cambios' : 'Crear seguro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
