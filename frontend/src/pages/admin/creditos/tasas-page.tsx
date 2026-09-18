import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, Percent, Filter, ExternalLink } from 'lucide-react'
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
import { type TasaCredito, type TipoTasa } from '@/types'

const TIPOS_TASA: { value: TipoTasa; label: string }[] = [
  { value: 'REFERENTIAL', label: 'Referencial (BCE)' },
  { value: 'MAXIMUM', label: 'Máxima Legal (BCE)' },
  { value: 'INSTITUTIONAL', label: 'Institucional' },
  { value: 'ADMIN_CONFIGURED', label: 'Personalizada' },
  { value: 'MARKET_REFERENCE', label: 'Referencia Mercado' },
  { value: 'ACADEMIC', label: 'Académica' },
]

const schema = z.object({
  productoId: z.number().optional(),
  tipoTasa: z.enum([
    'REFERENTIAL',
    'MAXIMUM',
    'INSTITUTIONAL',
    'ADMIN_CONFIGURED',
    'MARKET_REFERENCE',
    'ACADEMIC',
  ]),
  nombre: z.string().optional(),
  valor: z.number({ message: 'La tasa debe ser un número válido' }).min(0.01, 'La tasa debe ser mayor a 0%').max(100, 'Máximo 100%'),
  fechaVigencia: z.string().min(1, 'Fecha de vigencia requerida'),
  fechaFin: z.string().optional(),
  segmentoBce: z.string().optional(),
  institucionRef: z.string().optional(),
  observacion: z.string().optional(),
  urlFuente: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function TasasPage() {
  const queryClient = useQueryClient()
  const [editingTasa, setEditingTasa] = useState<TasaCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTipoTasaFilter, setSelectedTipoTasaFilter] = useState<string>('all')

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-credito'],
    queryFn: () => creditosService.getProductos(),
  })

  const { data: tasas = [], isLoading } = useQuery({
    queryKey: ['tasas-credito', selectedTipoTasaFilter],
    queryFn: () =>
      creditosService.getTasas(
        selectedTipoTasaFilter !== 'all' ? { tipoTasa: selectedTipoTasaFilter } : undefined,
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
      productoId: undefined,
      tipoTasa: 'INSTITUTIONAL',
      nombre: '',
      valor: 12.5,
      fechaVigencia: new Date().toISOString().split('T')[0],
      fechaFin: '',
      segmentoBce: '',
      institucionRef: '',
      observacion: '',
      urlFuente: '',
    },
  })

  const currentTipoTasa = watch('tipoTasa')
  const currentProductoId = watch('productoId')

  const openCreateDialog = () => {
    setEditingTasa(null)
    reset({
      productoId: undefined,
      tipoTasa: 'INSTITUTIONAL',
      nombre: '',
      valor: 14.5,
      fechaVigencia: new Date().toISOString().split('T')[0],
      fechaFin: '',
      segmentoBce: '',
      institucionRef: '',
      observacion: '',
      urlFuente: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: TasaCredito) => {
    setEditingTasa(item)
    reset({
      productoId: item.productoId ?? undefined,
      tipoTasa: item.tipoTasa,
      nombre: item.nombre || '',
      valor: item.valor,
      fechaVigencia: item.fechaVigencia ? item.fechaVigencia.split('T')[0] : '',
      fechaFin: item.fechaFin ? item.fechaFin.split('T')[0] : '',
      segmentoBce: item.segmentoBce || '',
      institucionRef: item.institucionRef || '',
      observacion: item.observacion || '',
      urlFuente: item.urlFuente || '',
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload: Partial<TasaCredito> = {
        ...values,
        productoId: values.productoId && values.productoId > 0 ? values.productoId : undefined,
        fechaFin: values.fechaFin || undefined,
      }
      if (editingTasa) {
        return creditosService.updateTasa(editingTasa.id, payload)
      }
      return creditosService.createTasa(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-credito'] })
      toast.success(editingTasa ? 'Tasa actualizada con éxito' : 'Tasa creada con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar la tasa'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleTasa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-credito'] })
      toast.success('Estado de la tasa actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado de la tasa'),
  })

  const getTipoTasaBadge = (tipo: TipoTasa) => {
    switch (tipo) {
      case 'MAXIMUM':
        return <Badge variant="destructive">Máxima Legal</Badge>
      case 'REFERENTIAL':
        return <Badge variant="secondary">Referencial BCE</Badge>
      case 'INSTITUTIONAL':
        return <Badge className="bg-primary/90">Institucional</Badge>
      case 'ADMIN_CONFIGURED':
        return <Badge variant="outline">Personalizada</Badge>
      default:
        return <Badge variant="outline">{tipo}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Tasas de Interés
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administra las tasas nominales y efectivas, referenciales y límites máximos
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tasa
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Listado de Tasas de Crédito</CardTitle>
              <CardDescription>Parámetros de cálculo de interés por producto o referencia</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>Tipo:</span>
              </div>
              <Select
                value={selectedTipoTasaFilter}
                onValueChange={setSelectedTipoTasaFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas las tasas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tasas</SelectItem>
                  {TIPOS_TASA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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
          ) : tasas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron tasas con el filtro seleccionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Detalle</TableHead>
                  <TableHead>Tipo Tasa</TableHead>
                  <TableHead className="text-right">Tasa Efectiva Anual</TableHead>
                  <TableHead>Aplica a Producto</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">
                        {item.nombre || 'Tasa sin título'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {item.segmentoBce && <span>BCE: {item.segmentoBce}</span>}
                        {item.urlFuente && (
                          <a
                            href={item.urlFuente}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-0.5"
                          >
                            Fuente <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTipoTasaBadge(item.tipoTasa)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-base text-primary">
                      {Number(item.valor).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      {item.productoNombre ? (
                        <span className="text-sm font-medium">{item.productoNombre}</span>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Global / Referencial
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {item.fechaVigencia}
                      {item.fechaFin && ` al ${item.fechaFin}`}
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
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTasa ? 'Editar Tasa de Interés' : 'Nueva Tasa de Interés'}</DialogTitle>
            <DialogDescription>
              Configura el valor porcentual, alcance y vigencia de la tasa.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values: FormData) => saveMutation.mutate(values))}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Tasa</Label>
                <Select
                  value={currentTipoTasa}
                  onValueChange={(val: TipoTasa) =>
                    setValue('tipoTasa', val, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_TASA.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Producto Asociado</Label>
                <Select
                  value={currentProductoId ? String(currentProductoId) : '0'}
                  onValueChange={(val) =>
                    setValue('productoId', val === '0' ? undefined : Number(val))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Global (Todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Global (Referencial general)</SelectItem>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="nombre">Nombre Identificador</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. Tasa Microcrédito Minorista"
                  {...register('nombre')}
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="valor">Tasa Anual (%)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="15.50"
                  {...register('valor', { valueAsNumber: true })}
                />
                {errors.valor && (
                  <p className="text-xs text-destructive">{errors.valor.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fechaVigencia">Fecha Inicio Vigencia</Label>
                <Input id="fechaVigencia" type="date" {...register('fechaVigencia')} />
                {errors.fechaVigencia && (
                  <p className="text-xs text-destructive">{errors.fechaVigencia.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaFin">Fecha Fin Vigencia (Opcional)</Label>
                <Input id="fechaFin" type="date" {...register('fechaFin')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="segmentoBce">Segmento Regulatorio (BCE)</Label>
                <Input
                  id="segmentoBce"
                  placeholder="Ej. Consumo Prioritario"
                  {...register('segmentoBce')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institucionRef">Institución de Referencia</Label>
                <Input
                  id="institucionRef"
                  placeholder="Ej. Banco Central del Ecuador"
                  {...register('institucionRef')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="urlFuente">URL de la Fuente Oficial (Opcional)</Label>
              <Input
                id="urlFuente"
                placeholder="https://www.bce.fin.ec/..."
                {...register('urlFuente')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacion">Observaciones</Label>
              <Textarea
                id="observacion"
                rows={2}
                placeholder="Resolución monetaria o notas institucionales..."
                {...register('observacion')}
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
                {saveMutation.isPending ? 'Guardando…' : editingTasa ? 'Guardar cambios' : 'Crear tasa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
