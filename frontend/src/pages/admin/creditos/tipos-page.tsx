import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, CheckCircle2, XCircle, Tag, Filter } from 'lucide-react'
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
import { type TipoCredito } from '@/types'

const schema = z.object({
  segmentoId: z.number({ message: 'Selecciona un segmento' }).min(1, 'Selecciona un segmento'),
  nombre: z.string().min(1, 'Nombre requerido').max(150),
  descripcion: z.string().optional(),
  orden: z.number({ message: 'El orden debe ser un número' }).min(0, 'El orden debe ser 0 o superior'),
})

type FormData = z.infer<typeof schema>

export function TiposPage() {
  const queryClient = useQueryClient()
  const [editingTipo, setEditingTipo] = useState<TipoCredito | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSegmentoFilter, setSelectedSegmentoFilter] = useState<string>('all')

  const { data: segmentos = [] } = useQuery({
    queryKey: ['segmentos-credito'],
    queryFn: creditosService.getSegmentos,
  })

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos-credito', selectedSegmentoFilter],
    queryFn: () =>
      creditosService.getTipos(
        selectedSegmentoFilter !== 'all' ? Number(selectedSegmentoFilter) : undefined,
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
      segmentoId: 0,
      nombre: '',
      descripcion: '',
      orden: 0,
    },
  })

  const currentSegmentoId = watch('segmentoId')

  const openCreateDialog = () => {
    setEditingTipo(null)
    reset({
      segmentoId: segmentos[0]?.id ?? 0,
      nombre: '',
      descripcion: '',
      orden: (tipos.length + 1) * 10,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (item: TipoCredito) => {
    setEditingTipo(item)
    reset({
      segmentoId: item.segmentoId,
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      orden: item.orden,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editingTipo) {
        return creditosService.updateTipo(editingTipo.id, values)
      }
      return creditosService.createTipo(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-credito'] })
      toast.success(editingTipo ? 'Tipo actualizado con éxito' : 'Tipo creado con éxito')
      setDialogOpen(false)
    },
    onError: () => toast.error('Ocurrió un error al guardar el tipo de crédito'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => creditosService.toggleTipo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-credito'] })
      toast.success('Estado del tipo actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado del tipo'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Tipos de Crédito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los subtipos clasificados bajo cada segmento crediticio
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tipo
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Listado de Tipos</CardTitle>
              <CardDescription>Tipos agrupados por segmento de cartera</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>Segmento:</span>
              </div>
              <Select
                value={selectedSegmentoFilter}
                onValueChange={setSelectedSegmentoFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos los segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los segmentos</SelectItem>
                  {segmentos.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
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
          ) : tipos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron tipos de crédito con el filtro actual.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Orden</TableHead>
                  <TableHead className="w-44">Segmento</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-28 text-center">Estado</TableHead>
                  <TableHead className="w-36 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.orden}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {item.segmentoNombre}
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
            <DialogTitle>{editingTipo ? 'Editar Tipo de Crédito' : 'Nuevo Tipo de Crédito'}</DialogTitle>
            <DialogDescription>
              Asocia este tipo al segmento correspondiente y configura sus propiedades.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values: FormData) => saveMutation.mutate(values))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>Segmento Perteneciente</Label>
              <Select
                value={String(currentSegmentoId || '')}
                onValueChange={(val) => setValue('segmentoId', Number(val), { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar segmento..." />
                </SelectTrigger>
                <SelectContent>
                  {segmentos.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre} ({s.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.segmentoId && (
                <p className="text-xs text-destructive">{errors.segmentoId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" placeholder="Ej. Crédito Automotriz" {...register('nombre')} />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre.message}</p>
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
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={3}
                placeholder="Características del tipo de crédito..."
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
                {saveMutation.isPending ? 'Guardando…' : editingTipo ? 'Guardar cambios' : 'Crear tipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
