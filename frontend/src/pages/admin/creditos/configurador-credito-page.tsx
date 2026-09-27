import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CirclePlus, Copy, ExternalLink, HandHeart, Pencil, Plus, Power, Receipt, Shield, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { creditosService } from '@/features/creditos/services/creditos.service'
import { messageFrom } from '@/features/identity-check/utils'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type {
  CargoConfiguracionDto,
  CategoriaCargo,
  ConfigurarCreditoRequest,
  ConfigurarCreditoResponse,
  MarcoNormativo,
  SegmentoNormativo,
  SistemaAmortizacion,
} from '@/types'

const MARCO_KEY = ['creditos', 'marco'] as const
const PRODUCTOS_KEY = ['creditosConfigurados'] as const

const entidadLabels: Record<MarcoNormativo['tipoEntidad'], string> = {
  BANCO: 'Banco',
  COOPERATIVA: 'Cooperativa de ahorro y crédito',
}

const categoriaLabels: Record<CategoriaCargo, string> = {
  SEGURO: 'Seguro',
  GASTO: 'Gasto o comisión',
  DONACION: 'Donación',
  OTRO: 'Otro',
}

const pct = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined ? '—' : `${value.toLocaleString('es-EC', { minimumFractionDigits: digits, maximumFractionDigits: 4 })} %`

/** A partir del 90 % de la tasa máxima se avisa en ámbar; por encima, en rojo. */
const UMBRAL_TOPE = 0.9

type NivelTasa = 'ok' | 'cerca' | 'excede'

function nivelTasa(tasa: number | null | undefined, maxima: number | null | undefined): NivelTasa {
  if (tasa == null || maxima == null || !Number.isFinite(tasa) || tasa <= 0) return 'ok'
  if (tasa > maxima) return 'excede'
  return tasa >= maxima * UMBRAL_TOPE ? 'cerca' : 'ok'
}

function nombreSegmento(marco: MarcoNormativo | undefined, codigo: string) {
  return marco?.segmentos.find((s) => s.codigo === codigo)?.nombre ?? codigo.replaceAll('_', ' ').toLowerCase()
}

// ═════════════════════════════════════════════════════════════════════════════
// Listado de productos
// ═════════════════════════════════════════════════════════════════════════════

export function CreditosAdminPage() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const marco = useQuery({ queryKey: MARCO_KEY, queryFn: creditosService.getMarco })
  const productos = useQuery({ queryKey: PRODUCTOS_KEY, queryFn: creditosService.getConfigurados })

  const estado = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => creditosService.cambiarEstado(id, active),
    onSuccess: async (_, { active }) => {
      await client.invalidateQueries({ queryKey: PRODUCTOS_KEY })
      await client.invalidateQueries({ queryKey: ['simulador', 'productos'] })
      toast.success(active ? 'Tipo de crédito activado.' : 'Tipo de crédito desactivado.')
    },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo cambiar el estado del producto.')),
  })

  const lista = productos.data ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tipos de crédito"
        description="Crea los tipos de crédito que verán los clientes en el simulador. Las tasas se validan contra la tasa máxima vigente del BCE."
        actions={<Button onClick={() => navigate('/admin/creditos/nuevo')}><CirclePlus />Nuevo tipo de crédito</Button>}
      />

      {marco.data && <MarcoResumen marco={marco.data} />}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Tipo de crédito</th>
              <th className="p-4 font-medium">Montos y plazos</th>
              <th className="p-4 font-medium">Tasa</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {lista.map((producto) => {
              const segmento = marco.data?.segmentos.find((s) => s.codigo === producto.segmentoBce)
              const nivel = nivelTasa(producto.tasaInteres, segmento?.tasaMaxima)
              const anios = producto.unidadPlazo === 'ANIOS'
              return (
                <tr key={producto.id} className="border-b last:border-0 align-top">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{producto.nombre}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {nombreSegmento(marco.data, producto.segmentoBce)} · {producto.entidad}
                    </p>
                    {producto.cargosIndirectos && producto.cargosIndirectos.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {producto.cargosIndirectos.length} cobro{producto.cargosIndirectos.length === 1 ? '' : 's'} indirecto{producto.cargosIndirectos.length === 1 ? '' : 's'}
                      </p>
                    )}
                  </td>
                  <td className="p-4 tabular-nums">
                    {formatCurrency(producto.montoMin)} – {formatCurrency(producto.montoMax)}
                    <span className="block text-xs text-muted-foreground">
                      {anios ? `${producto.plazoMinMeses / 12} a ${producto.plazoMaxMeses / 12} años` : `${producto.plazoMinMeses} a ${producto.plazoMaxMeses} meses`}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn('font-medium tabular-nums', nivel === 'excede' && 'text-destructive', nivel === 'cerca' && 'text-brand-gold')}>{pct(producto.tasaInteres)}</span>
                    <span className="block text-xs text-muted-foreground">Desgravamen {pct(producto.tasaDesgravamenMensual, 4)} mensual</span>
                    {nivel === 'excede' && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                        Supera el tope vigente ({pct(segmento?.tasaMaxima)}): no se ofrece
                      </span>
                    )}
                    {nivel === 'cerca' && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-brand-gold">
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                        {producto.tasaInteres === segmento?.tasaMaxima ? 'En el tope' : 'Cerca del tope'} ({pct(segmento?.tasaMaxima)}): revisa al publicarse nuevas tasas
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge tone={producto.activo ? 'success' : 'neutral'}>{producto.activo ? 'Activo' : 'Inactivo'}</StatusBadge>
                  </td>
                  <td className="whitespace-nowrap p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/creditos/${producto.id}/editar`)}>
                      <Pencil className="size-4" />Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/creditos/nuevo?desde=${producto.id}`)}>
                      <Copy className="size-4" />Duplicar
                    </Button>
                    <Button variant="ghost" size="sm" disabled={estado.isPending}
                      onClick={() => estado.mutate({ id: producto.id, active: !producto.activo })}>
                      <Power className="size-4" />{producto.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {productos.isPending && <p className="p-6 text-sm text-muted-foreground">Cargando productos…</p>}
        {productos.isError && <p className="p-6 text-sm text-destructive">{messageFrom(productos.error, 'No se pudieron cargar los productos.')}</p>}
        {!productos.isPending && lista.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Todavía no hay productos. Crea el primero para que aparezca en el simulador.</p>
        )}
      </div>
    </div>
  )
}

function MarcoResumen({ marco }: { marco: MarcoNormativo }) {
  const { hasPermission } = useAuth()
  const fuente = marco.segmentos.find((s) => s.urlFuente)
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        Institución configurada como <strong>{entidadLabels[marco.tipoEntidad]}</strong>.
        Desgravamen permitido: {pct(marco.desgravamen.minimo, 4)} a {pct(marco.desgravamen.maximo, 4)} mensual.
        {hasPermission('institution.manage') && (
          <> <Link to="/admin/configuracion" className="text-brand-teal underline underline-offset-4">Cambiar tipo de entidad</Link></>
        )}
      </p>
      {fuente?.urlFuente && (
        <a href={fuente.urlFuente} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Tasas BCE: {fuente.fuenteTasa}<ExternalLink className="size-3" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Editor
// ═════════════════════════════════════════════════════════════════════════════

type Unidad = 'MESES' | 'ANIOS'

interface Borrador {
  nombre: string
  segmentoBce: string
  descripcion: string
  montoMin: string
  montoMax: string
  unidadPlazo: Unidad
  plazoMin: string
  plazoMax: string
  tasaInteres: string
  tasaDesgravamenMensual: string
  frances: boolean
  aleman: boolean
  activo: boolean
}

interface CargoBorrador {
  key: number
  categoria: CategoriaCargo
  nombre: string
  tipoCargo: 'FIJO' | 'PORCENTAJE'
  valor: string
  periodicidad: 'MENSUAL' | 'UNICO'
  baseCalculo: 'SALDO_DEUDOR' | 'MONTO_SOLICITADO' | 'FIJO'
  normaAplicable: string
  obligatorio: boolean
}

let nextKey = 1

function borradorInicial(producto: ConfigurarCreditoResponse | undefined, marco: MarcoNormativo,
                         plantilla?: ConfigurarCreditoResponse): Borrador {
  if (!producto && plantilla) {
    // Copia inactiva: el asesor revisa la variante antes de publicarla.
    return { ...borradorInicial(plantilla, marco), nombre: `${plantilla.nombre} (copia)`.slice(0, 120), activo: false }
  }
  if (producto) {
    const anios = producto.unidadPlazo === 'ANIOS'
    return {
      nombre: producto.nombre,
      segmentoBce: producto.segmentoBce,
      descripcion: producto.descripcion ?? '',
      montoMin: String(producto.montoMin),
      montoMax: String(producto.montoMax),
      unidadPlazo: anios ? 'ANIOS' : 'MESES',
      plazoMin: String(anios ? producto.plazoMinMeses / 12 : producto.plazoMinMeses),
      plazoMax: String(anios ? producto.plazoMaxMeses / 12 : producto.plazoMaxMeses),
      tasaInteres: producto.tasaInteres != null ? String(producto.tasaInteres) : '',
      tasaDesgravamenMensual: String(producto.tasaDesgravamenMensual ?? ''),
      frances: producto.sistemasPermitidos.includes('FRANCES'),
      aleman: producto.sistemasPermitidos.includes('ALEMAN'),
      activo: producto.activo,
    }
  }
  const segmento = marco.segmentos.find((s) => s.codigo === 'CONSUMO_PRIORITARIO') ?? marco.segmentos[0]
  // Solo se precarga la tasa referencial publicada por el BCE; montos, plazos y desgravamen los decide el asesor.
  return {
    nombre: '',
    segmentoBce: segmento?.codigo ?? '',
    descripcion: '',
    montoMin: '',
    montoMax: '',
    unidadPlazo: 'MESES',
    plazoMin: '',
    plazoMax: '',
    tasaInteres: segmento?.tasaReferencial != null ? String(segmento.tasaReferencial) : '',
    tasaDesgravamenMensual: '',
    frances: true,
    aleman: true,
    activo: true,
  }
}

function cargoDesde(dto: CargoConfiguracionDto): CargoBorrador {
  return {
    key: nextKey++,
    categoria: dto.categoria ?? (dto.nombre.toLowerCase().includes('seguro') ? 'SEGURO' : 'GASTO'),
    nombre: dto.nombre,
    tipoCargo: dto.tipoCargo === 'PORCENTAJE' ? 'PORCENTAJE' : 'FIJO',
    valor: String(dto.valor),
    periodicidad: dto.periodicidad === 'UNICO' ? 'UNICO' : 'MENSUAL',
    baseCalculo: (dto.baseCalculo as CargoBorrador['baseCalculo']) ?? 'SALDO_DEUDOR',
    normaAplicable: dto.normaAplicable ?? '',
    obligatorio: dto.obligatorio ?? true,
  }
}

/** Plantillas sin valores: el asesor debe ingresar el monto o porcentaje real. */
function cargoNuevo(categoria: CategoriaCargo): CargoBorrador {
  const base = { key: nextKey++, categoria, nombre: '', valor: '', normaAplicable: '' }
  switch (categoria) {
    case 'SEGURO':
      return { ...base, tipoCargo: 'PORCENTAJE', periodicidad: 'MENSUAL', baseCalculo: 'SALDO_DEUDOR', obligatorio: true }
    case 'DONACION':
      return { ...base, tipoCargo: 'FIJO', periodicidad: 'MENSUAL', baseCalculo: 'FIJO', obligatorio: false }
    default:
      return { ...base, tipoCargo: 'FIJO', periodicidad: 'UNICO', baseCalculo: 'FIJO', obligatorio: true }
  }
}

function normalizarBase(cargo: CargoBorrador): CargoBorrador {
  if (cargo.tipoCargo === 'FIJO') return { ...cargo, baseCalculo: 'FIJO' }
  if (cargo.periodicidad === 'UNICO') return { ...cargo, baseCalculo: 'MONTO_SOLICITADO' }
  return cargo.baseCalculo === 'FIJO' ? { ...cargo, baseCalculo: 'SALDO_DEUDOR' } : cargo
}

function errorCargo(cargo: CargoBorrador, marco: MarcoNormativo, todos: CargoBorrador[]): string | null {
  const nombre = cargo.nombre.trim()
  if (nombre.length < 3) return 'Escribe un nombre de al menos 3 caracteres.'
  if (nombre.toLowerCase().includes('desgravamen')) return 'El desgravamen se configura en su propio campo.'
  if (todos.filter((c) => c.nombre.trim().toLowerCase() === nombre.toLowerCase()).length > 1) return 'Hay otro cobro con este nombre.'
  const valor = Number(cargo.valor)
  if (!cargo.valor || !Number.isFinite(valor) || valor <= 0) return 'Ingresa un valor mayor a 0.'
  const l = marco.cargos
  const tope = cargo.tipoCargo === 'PORCENTAJE'
    ? cargo.periodicidad === 'MENSUAL' ? l.porcentajeMensualMaximo : l.unicoPorcentajeMaximo
    : cargo.periodicidad === 'MENSUAL' ? l.fijoMensualMaximo : l.unicoFijoMaximo
  if (valor > tope) return `Supera el tope prudencial de ${cargo.tipoCargo === 'PORCENTAJE' ? pct(tope) : formatCurrency(tope)}${cargo.periodicidad === 'MENSUAL' ? ' por cuota' : ''}.`
  if (cargo.categoria === 'DONACION' && cargo.obligatorio) return 'Una donación no puede ser obligatoria.'
  return null
}

interface CreditoEditorProps {
  producto?: ConfigurarCreditoResponse
  plantilla?: ConfigurarCreditoResponse
  marco: MarcoNormativo
  saving: boolean
  onCancel: () => void
  onSave: (request: ConfigurarCreditoRequest, activo: boolean) => void
}

function CreditoEditor({ producto, plantilla, marco, saving, onCancel, onSave }: CreditoEditorProps) {
  const [form, setForm] = useState<Borrador>(() => borradorInicial(producto, marco, plantilla))
  const [cargos, setCargos] = useState<CargoBorrador[]>(() =>
    ((producto ?? plantilla)?.cargosIndirectos ?? []).map(cargoDesde))
  const [intentado, setIntentado] = useState(false)

  const segmentosVisibles = useMemo(() => {
    const vigentes = marco.segmentos
    // Un producto antiguo puede estar en un segmento derogado: se muestra para no perder el dato.
    return producto && !vigentes.some((s) => s.codigo === producto.segmentoBce)
      ? [...vigentes, { codigo: producto.segmentoBce, nombre: `${producto.segmentoBce} (ya no vigente)` } as SegmentoNormativo]
      : vigentes
  }, [marco.segmentos, producto])
  const segmento = marco.segmentos.find((s) => s.codigo === form.segmentoBce)
  const nivelActual = nivelTasa(Number(form.tasaInteres), segmento?.tasaMaxima)

  const set = <K extends keyof Borrador>(key: K, value: Borrador[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const factor = form.unidadPlazo === 'ANIOS' ? 12 : 1
  const unidadTexto = form.unidadPlazo === 'ANIOS' ? 'años' : 'meses'

  const errores = useMemo(() => {
    const e: Partial<Record<keyof Borrador, string>> = {}
    const nombre = form.nombre.trim()
    if (nombre.length < 3 || nombre.length > 120) e.nombre = 'Escribe un nombre de 3 a 120 caracteres.'
    if (!segmento) e.segmentoBce = 'Selecciona un segmento vigente.'
    const montoMin = Number(form.montoMin)
    const montoMax = Number(form.montoMax)
    if (!form.montoMin || montoMin < 50) e.montoMin = 'El monto mínimo debe ser de al menos $50.'
    if (!form.montoMax) e.montoMax = 'Ingresa el monto máximo.'
    else if (montoMax < montoMin) e.montoMax = 'El monto máximo no puede ser menor al mínimo.'
    else if (segmento?.montoMaximo != null && montoMax > segmento.montoMaximo) e.montoMax = `La política institucional permite hasta ${formatCurrency(segmento.montoMaximo)} en este segmento.`
    const plazoMin = Number(form.plazoMin)
    const plazoMax = Number(form.plazoMax)
    if (!form.plazoMin || !Number.isInteger(plazoMin) || plazoMin < 1) e.plazoMin = `Ingresa un plazo mínimo entero en ${unidadTexto}.`
    if (!form.plazoMax || !Number.isInteger(plazoMax)) e.plazoMax = `Ingresa un plazo máximo entero en ${unidadTexto}.`
    else if (plazoMax < plazoMin) e.plazoMax = 'El plazo máximo no puede ser menor al mínimo.'
    else if (plazoMax * factor > 360) e.plazoMax = 'El plazo máximo no puede superar 30 años.'
    else if (segmento?.plazoMaximoMeses != null && plazoMax * factor > segmento.plazoMaximoMeses) e.plazoMax = `La política institucional permite hasta ${segmento.plazoMaximoMeses} meses en este segmento.`
    const tasa = Number(form.tasaInteres)
    if (!form.tasaInteres || tasa <= 0) e.tasaInteres = 'Ingresa la tasa efectiva anual.'
    else if (segmento?.tasaMaxima != null && tasa > segmento.tasaMaxima) e.tasaInteres = `Supera la tasa máxima del BCE para este segmento (${pct(segmento.tasaMaxima)}).`
    const desgravamen = Number(form.tasaDesgravamenMensual)
    if (!form.tasaDesgravamenMensual) e.tasaDesgravamenMensual = 'Ingresa la tasa mensual del seguro de desgravamen.'
    else if (desgravamen < marco.desgravamen.minimo || desgravamen > marco.desgravamen.maximo) e.tasaDesgravamenMensual = `Debe estar entre ${pct(marco.desgravamen.minimo, 4)} y ${pct(marco.desgravamen.maximo, 4)} para un ${entidadLabels[marco.tipoEntidad].toLowerCase()}.`
    if (!form.frances && !form.aleman) e.frances = 'Habilita al menos un sistema de amortización.'
    return e
  }, [form, segmento, marco, factor, unidadTexto])

  const erroresCargos = cargos.map((c) => errorCargo(c, marco, cargos))
  const hayErrores = Object.keys(errores).length > 0 || erroresCargos.some(Boolean)

  function actualizarCargo(key: number, cambios: Partial<CargoBorrador>) {
    setCargos((prev) => prev.map((c) => {
      if (c.key !== key) return c
      const nuevo = normalizarBase({ ...c, ...cambios })
      return nuevo.categoria === 'DONACION' ? { ...nuevo, obligatorio: false } : nuevo
    }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setIntentado(true)
    if (hayErrores) {
      toast.error('Revisa los campos marcados antes de guardar.')
      return
    }
    const sistemas: SistemaAmortizacion[] = []
    if (form.frances) sistemas.push('FRANCES')
    if (form.aleman) sistemas.push('ALEMAN')
    onSave({
      nombre: form.nombre.trim(),
      segmentoBce: form.segmentoBce,
      descripcion: form.descripcion.trim() || undefined,
      montoMin: Number(form.montoMin),
      montoMax: Number(form.montoMax),
      plazoMinMeses: Number(form.plazoMin) * factor,
      plazoMaxMeses: Number(form.plazoMax) * factor,
      unidadPlazo: form.unidadPlazo,
      tasaInteres: Number(form.tasaInteres),
      tasaDesgravamenMensual: Number(form.tasaDesgravamenMensual),
      sistemasPermitidos: sistemas,
      cargosIndirectos: cargos.map((c) => ({
        nombre: c.nombre.trim(),
        categoria: c.categoria,
        tipoCargo: c.tipoCargo,
        valor: Number(c.valor),
        periodicidad: c.periodicidad,
        baseCalculo: c.baseCalculo,
        normaAplicable: c.normaAplicable.trim() || undefined,
        obligatorio: c.obligatorio,
      })),
    }, form.activo)
  }

  const error = (key: keyof Borrador) => intentado && errores[key]
    ? <p className="text-xs text-destructive">{errores[key]}</p> : null

  return (
    <div className="space-y-8">
      <PageHeader
        title={producto ? 'Editar tipo de crédito' : plantilla ? `Duplicar “${plantilla.nombre}”` : 'Nuevo tipo de crédito'}
        description="Define cómo verán y simularán los clientes este crédito. Los límites se validan contra la normativa vigente."
        actions={<Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Volver a tipos de crédito</Button>}
      />

      <form onSubmit={submit} noValidate className="space-y-6">
        <Card title="Tipo de crédito" description={`Se publicará como crédito de ${entidadLabels[marco.tipoEntidad].toLowerCase()}; el tipo de entidad viene de la configuración institucional.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre comercial *</Label>
              <Input id="nombre" value={form.nombre} maxLength={120} onChange={(e) => set('nombre', e.target.value)}
                placeholder="Ej. Crédito Auto Fácil" aria-invalid={Boolean(intentado && errores.nombre)} />
              {error('nombre')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento de crédito (BCE) *</Label>
              <Select value={form.segmentoBce} onValueChange={(value) => {
                const nuevo = marco.segmentos.find((s) => s.codigo === value)
                setForm((prev) => ({
                  ...prev,
                  segmentoBce: value,
                  // Al cambiar de segmento se propone la tasa referencial publicada por el BCE.
                  tasaInteres: !producto && nuevo?.tasaReferencial != null ? String(nuevo.tasaReferencial) : prev.tasaInteres,
                }))
              }}>
                <SelectTrigger id="segmento"><SelectValue placeholder="Selecciona el segmento" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {segmentosVisibles.map((s) => (
                    <SelectItem key={s.codigo} value={s.codigo}>
                      {s.nombre}{s.tasaMaxima != null && ` · máx. ${pct(s.tasaMaxima)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {segmento && <p className="text-xs text-muted-foreground">{segmento.descripcion}</p>}
              {error('segmentoBce')}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción para el cliente</Label>
              <Textarea id="descripcion" rows={2} maxLength={400} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Para qué sirve y quién puede solicitarlo" />
            </div>
            <label className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={form.activo} onCheckedChange={(value) => set('activo', value)} />
              <span className="text-sm">Visible en el simulador público</span>
            </label>
          </div>
        </Card>

        <Card title="Condiciones" description="Montos, plazos, tasa y seguro de desgravamen que aplicará el simulador.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="montoMin">Monto mínimo (USD) *</Label>
              <Input id="montoMin" type="number" min="50" step="50" value={form.montoMin} onChange={(e) => set('montoMin', e.target.value)} />
              {error('montoMin')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="montoMax">Monto máximo (USD) *</Label>
              <Input id="montoMax" type="number" min="50" step="50" value={form.montoMax} onChange={(e) => set('montoMax', e.target.value)} />
              {segmento?.montoMaximo != null && <p className="text-xs text-muted-foreground">Política institucional: hasta {formatCurrency(segmento.montoMaximo)}</p>}
              {error('montoMax')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidad">El cliente elige el plazo en</Label>
              <Select value={form.unidadPlazo} onValueChange={(value: Unidad) => set('unidadPlazo', value)}>
                <SelectTrigger id="unidad"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MESES">Meses (cuota mensual)</SelectItem>
                  <SelectItem value="ANIOS">Años (cuota anual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="plazoMin">Plazo mín. *</Label>
                <Input id="plazoMin" type="number" min="1" step="1" value={form.plazoMin} onChange={(e) => set('plazoMin', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plazoMax">Plazo máx. *</Label>
                <Input id="plazoMax" type="number" min="1" step="1" value={form.plazoMax} onChange={(e) => set('plazoMax', e.target.value)} />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">En {unidadTexto}{segmento?.plazoMaximoMeses != null && ` · política: hasta ${segmento.plazoMaximoMeses} meses`}</p>
              <div className="col-span-2">{error('plazoMin') ?? error('plazoMax')}</div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tasa">Tasa efectiva anual (%) *</Label>
              <Input id="tasa" type="number" step="0.01" min="0.01" value={form.tasaInteres} onChange={(e) => set('tasaInteres', e.target.value)}
                aria-describedby="tasa-tope"
                className={cn(nivelActual === 'excede' && 'border-destructive', nivelActual === 'cerca' && 'border-brand-gold')} />
              {nivelActual === 'cerca' && segmento?.tasaMaxima != null && (
                <p id="tasa-tope" className="flex items-center gap-1 text-xs text-brand-gold">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  Está al {Math.round((Number(form.tasaInteres) / segmento.tasaMaxima) * 100)} % de la tasa máxima: si el BCE la baja, este crédito dejará de ofrecerse.
                </p>
              )}
              {segmento && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Máxima BCE: <strong className="text-foreground">{pct(segmento.tasaMaxima)}</strong></span>
                  <span>Referencial: {pct(segmento.tasaReferencial)}</span>
                  {segmento.tasaReferencial != null && String(segmento.tasaReferencial) !== form.tasaInteres && (
                    <button type="button" className="text-brand-teal underline underline-offset-4" onClick={() => set('tasaInteres', String(segmento.tasaReferencial))}>
                      Usar la referencial
                    </button>
                  )}
                </p>
              )}
              {error('tasaInteres')}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="desgravamen" className="flex items-center gap-1"><Shield className="size-3.5 text-muted-foreground" />Desgravamen mensual sobre saldo (%) *</Label>
              <Input id="desgravamen" type="number" step="0.0001" min="0" value={form.tasaDesgravamenMensual} onChange={(e) => set('tasaDesgravamenMensual', e.target.value)}
                placeholder={`${marco.desgravamen.minimo} a ${marco.desgravamen.maximo}`} />
              <p className="text-xs text-muted-foreground">
                Rango para {entidadLabels[marco.tipoEntidad].toLowerCase()}: {pct(marco.desgravamen.minimo, 4)} – {pct(marco.desgravamen.maximo, 4)}. La prima real la fija la aseguradora.
              </p>
              {error('tasaDesgravamenMensual')}
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Sistemas de amortización *</p>
            <div className="flex flex-wrap gap-3">
              {([['frances', 'Francés (cuota fija)'], ['aleman', 'Alemán (capital fijo)']] as const).map(([key, label]) => (
                <label key={key} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', form[key] ? 'border-brand-teal bg-brand-teal/5' : 'text-muted-foreground')}>
                  <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="accent-[var(--brand-teal)]" />
                  {label}
                </label>
              ))}
            </div>
            {error('frances')}
          </div>
        </Card>

        <Card
          title="Cobros indirectos"
          description={`Seguros adicionales, gastos y donaciones. En el simulador se suman en una sola columna. Máximo ${marco.cargos.maximoPorProducto}.`}
          actions={
            <div className="flex flex-wrap gap-2">
              {([['SEGURO', 'Seguro', Shield], ['GASTO', 'Gasto', Receipt], ['DONACION', 'Donación', HandHeart]] as const).map(([categoria, label, Icon]) => (
                <Button key={categoria} type="button" variant="outline" size="sm" disabled={cargos.length >= marco.cargos.maximoPorProducto}
                  onClick={() => setCargos((prev) => [...prev, cargoNuevo(categoria)])}>
                  <Plus className="size-3.5" /><Icon className="size-3.5" />{label}
                </Button>
              ))}
            </div>
          }
        >
          {cargos.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Sin cobros adicionales: el cliente pagará capital, interés y desgravamen.
            </p>
          ) : (
            <div className="space-y-3">
              {cargos.map((cargo, index) => (
                <CargoFila key={cargo.key} cargo={cargo} error={intentado || cargo.valor ? erroresCargos[index] : null}
                  onChange={(cambios) => actualizarCargo(cargo.key, cambios)}
                  onRemove={() => setCargos((prev) => prev.filter((c) => c.key !== cargo.key))} />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Topes prudenciales: {pct(marco.cargos.porcentajeMensualMaximo)} o {formatCurrency(marco.cargos.fijoMensualMaximo)} por cuota;
            cobro único hasta {pct(marco.cargos.unicoPorcentajeMaximo)} del monto o {formatCurrency(marco.cargos.unicoFijoMaximo)}.
            Los cobros opcionales (como donaciones) solo se suman si el cliente los elige.
          </p>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="brand" disabled={saving}>{saving ? 'Guardando…' : 'Guardar tipo de crédito'}</Button>
        </div>
      </form>
    </div>
  )
}

function Card({ title, description, actions, children }: { title: string; description: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function CargoFila({ cargo, error, onChange, onRemove }: {
  cargo: CargoBorrador
  error: string | null
  onChange: (cambios: Partial<CargoBorrador>) => void
  onRemove: () => void
}) {
  const porcentaje = cargo.tipoCargo === 'PORCENTAJE'
  return (
    <div className={cn('rounded-lg border bg-muted/20 p-3.5', error && 'border-destructive/50')}>
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">Categoría</Label>
          <Select value={cargo.categoria} onValueChange={(value: CategoriaCargo) => onChange({ categoria: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(categoriaLabels) as CategoriaCargo[]).map((c) => <SelectItem key={c} value={c}>{categoriaLabels[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 lg:col-span-3">
          <Label className="text-xs">Nombre</Label>
          <Input value={cargo.nombre} maxLength={120} onChange={(e) => onChange({ nombre: e.target.value })}
            placeholder={cargo.categoria === 'SEGURO' ? 'Ej. Seguro vehicular' : cargo.categoria === 'DONACION' ? 'Ej. Aporte Fundación Niñez' : 'Ej. Gastos notariales'} />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">Se cobra</Label>
          <Select value={cargo.periodicidad} onValueChange={(value: 'MENSUAL' | 'UNICO') => onChange({ periodicidad: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MENSUAL">Cada mes</SelectItem>
              <SelectItem value="UNICO">Una vez (1.ª cuota)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">Tipo</Label>
          <Select value={cargo.tipoCargo} onValueChange={(value: 'FIJO' | 'PORCENTAJE') => onChange({ tipoCargo: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PORCENTAJE">Porcentaje</SelectItem>
              <SelectItem value="FIJO">Valor fijo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">{porcentaje ? 'Porcentaje (%)' : 'Valor (USD)'}</Label>
          <Input type="number" min="0" step={porcentaje ? '0.0001' : '0.01'} value={cargo.valor} onChange={(e) => onChange({ valor: e.target.value })} placeholder="Requerido" />
        </div>
        <div className="flex justify-end lg:col-span-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Quitar cobro" onClick={onRemove}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        {porcentaje && cargo.periodicidad === 'MENSUAL' && (
          <label className="flex items-center gap-2">
            Calcular sobre
            <Select value={cargo.baseCalculo} onValueChange={(value: 'SALDO_DEUDOR' | 'MONTO_SOLICITADO') => onChange({ baseCalculo: value })}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SALDO_DEUDOR">Saldo pendiente</SelectItem>
                <SelectItem value="MONTO_SOLICITADO">Monto solicitado</SelectItem>
              </SelectContent>
            </Select>
          </label>
        )}
        {porcentaje && cargo.periodicidad === 'UNICO' && <span className="text-muted-foreground">Se calcula sobre el monto solicitado.</span>}
        <label className="flex items-center gap-2">
          <Switch checked={cargo.obligatorio} disabled={cargo.categoria === 'DONACION'} onCheckedChange={(value) => onChange({ obligatorio: value })} />
          {cargo.categoria === 'DONACION' ? 'Opcional para el cliente' : cargo.obligatorio ? 'Obligatorio' : 'Opcional para el cliente'}
        </label>
        <Input value={cargo.normaAplicable} maxLength={200} onChange={(e) => onChange({ normaAplicable: e.target.value })}
          placeholder="Póliza o referencia (opcional)" className="h-8 max-w-xs text-xs" />
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Rutas de creación y edición
// ═════════════════════════════════════════════════════════════════════════════

export function CreditoProductEditorPage() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const [search] = useSearchParams()
  const client = useQueryClient()
  const marco = useQuery({ queryKey: MARCO_KEY, queryFn: creditosService.getMarco })
  const productos = useQuery({ queryKey: PRODUCTOS_KEY, queryFn: creditosService.getConfigurados })
  const producto = productId ? productos.data?.find((item) => item.id === Number(productId)) : undefined
  const desde = search.get('desde')
  const plantilla = !productId && desde ? productos.data?.find((item) => item.id === Number(desde)) : undefined

  const guardar = useMutation({
    mutationFn: async ({ request, activo }: { request: ConfigurarCreditoRequest; activo: boolean }) => {
      let respuesta = producto
        ? await creditosService.actualizarCredito(producto.id, request)
        : await creditosService.configurarCredito(request)
      if (respuesta.activo !== activo) respuesta = await creditosService.cambiarEstado(respuesta.id, activo)
      return respuesta
    },
    onSuccess: async (respuesta) => {
      await client.invalidateQueries({ queryKey: PRODUCTOS_KEY })
      await client.invalidateQueries({ queryKey: ['simulador', 'productos'] })
      toast.success(producto ? 'Tipo de crédito actualizado.' : 'Tipo de crédito creado.', { description: `${respuesta.nombre} · ${respuesta.entidad}` })
      navigate('/admin/creditos')
    },
    onError: (error) => toast.error('No se pudo guardar el tipo de crédito', { description: messageFrom(error, 'Revisa los datos e inténtalo de nuevo.') }),
  })

  if (marco.isPending || productos.isPending) return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
  if (marco.isError || !marco.data) {
    return <p className="p-6 text-sm text-destructive">{messageFrom(marco.error, 'No se pudo cargar la normativa vigente.')}</p>
  }
  if (productId && !producto) {
    return (
      <div className="space-y-4">
        <PageHeader title="Tipo de crédito no encontrado" description="No encontramos el tipo de crédito solicitado." />
        <Button onClick={() => navigate('/admin/creditos')}>Volver a tipos de crédito</Button>
      </div>
    )
  }

  return (
    <CreditoEditor
      key={producto?.id ?? (plantilla ? `copia-${plantilla.id}` : 'nuevo')}
      producto={producto}
      plantilla={plantilla}
      marco={marco.data}
      saving={guardar.isPending}
      onCancel={() => navigate('/admin/creditos')}
      onSave={(request, activo) => guardar.mutate({ request, activo })}
    />
  )
}

// Alias de retrocompatibilidad
export const ConfiguradorCreditoPage = CreditosAdminPage
