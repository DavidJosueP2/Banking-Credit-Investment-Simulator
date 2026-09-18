import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { type SegmentoCredito } from '@/types'

const schema = z.object({
  codigo: z.string().min(1, 'Código requerido').max(50),
  nombre: z.string().min(1, 'Nombre requerido').max(150),
  descripcion: z.string().optional(),
  orden: z.number({ message: 'El orden debe ser un número' }).min(0, 'El orden debe ser 0 o superior'),
})

type FormData = z.infer<typeof schema>

export function SegmentosPage() {
  const queryClient = useQueryClient()
  const [editingSegmento, setEditingSegmento] = useState<SegmentoCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: segmentos = [], isLoading } = useQuery({
    queryKey: ['segmentos-credito'],
    queryFn: creditosService.getSegmentos,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      orden: 0,
    },
  })

  const openCreateDialog = () => {
    setEditingSegmento(null)
    reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      orden: (segmentos.length + 1) * 10,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: SegmentoCredito) => {
    setEditingSegmento(item)
    reset({
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      orden: item.orden,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editingSegmento) {
        return creditosService.updateSegmento(editingSegmento.id, values)
      }
      return creditosService.createSegmento(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segmentos-credito'] })
      toast.success(editingSegmento ? 'Segmento actualizado con éxito' : 'Segmento creado con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar el segmento'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleSegmento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segmentos-credito'] })
      toast.success('Estado del segmento actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado del segmento'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Segmentos de Crédito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define la clasificación macro de las carteras y normativas crediticias
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Segmento
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Listado de Segmentos</CardTitle>
              <CardDescription>Segmentos regulatorios e institucionales activos</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{segmentos.length} Totales</Badge>
              <Badge variant="secondary">
                {segmentos.filter((s) => s.activo).length} Activos
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : segmentos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay segmentos de crédito registrados aún.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Orden</TableHead>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-28 text-center">Estado</TableHead>
                  <TableHead className="w-36 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segmentos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.orden}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {item.codigo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{item.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
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
            <DialogTitle>
              {editingSegmento ? 'Editar Segmento' : 'Nuevo Segmento de Crédito'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles del segmento para la categorización crediticia.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values: FormData) => saveMutation.mutate(values))}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" placeholder="Ej. CONSUMO_ORD" {...register('codigo')} />
                {errors.codigo && (
                  <p className="text-xs text-destructive">{errors.codigo.message}</p>
                )}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="orden">Orden</Label>
                <Input id="orden" type="number" {...register('orden', { valueAsNumber: true })} />
                {errors.orden && (
                  <p className="text-xs text-destructive">{errors.orden.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" placeholder="Ej. Consumo Ordinario" {...register('nombre')} />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={3}
                placeholder="Detalle o alcance del segmento normativo..."
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
                {saveMutation.isPending ? 'Guardando…' : editingSegmento ? 'Guardar cambios' : 'Crear segmento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
