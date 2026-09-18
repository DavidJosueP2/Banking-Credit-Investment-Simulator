import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Search,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { creditosService } from '@/features/creditos/services/creditos.service'
import { type ProductoCredito } from '@/types'

export function CatalogoPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegmentoId, setSelectedSegmentoId] = useState<number | null>(null)

  const { data: segmentos = [] } = useQuery({
    queryKey: ['segmentos-credito'],
    queryFn: creditosService.getSegmentos,
  })

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos-credito'],
    queryFn: () => creditosService.getProductos(),
  })

  const filteredProductos = productos.filter((p: ProductoCredito) => {
    const matchesSegmento =
      selectedSegmentoId === null || p.segmentoId === selectedSegmentoId
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipoCreditoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSegmento && matchesSearch && p.activo
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 via-primary to-primary/85 text-primary-foreground p-8 sm:p-12 shadow-xl border border-primary/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Portafolio Financiero Institucional
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Catálogo de Líneas de Crédito
          </h1>
          <p className="text-primary-foreground/90 text-sm sm:text-base leading-relaxed">
            Descubre opciones de crédito diseñadas para cada una de tus metas personales, comerciales o
            de inversión, con tasas preferenciales y total transparencia.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background text-foreground border-none shadow-md h-11"
              />
            </div>
            <Button
              variant="secondary"
              className="h-11 shadow-md font-semibold"
              onClick={() => navigate('/creditos/simular')}
            >
              Ir al Simulador
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filtros por Segmento ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="w-4 h-4 text-primary" />
          Filtrar por Segmento:
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSegmentoId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSegmentoId(null)}
            className="rounded-full text-xs"
          >
            Todos ({productos.filter((p) => p.activo).length})
          </Button>
          {segmentos.map((seg) => {
            const count = productos.filter((p) => p.segmentoId === seg.id && p.activo).length
            return (
              <Button
                key={seg.id}
                variant={selectedSegmentoId === seg.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSegmentoId(seg.id)}
                className="rounded-full text-xs"
              >
                {seg.nombre} ({count})
              </Button>
            )
          })}
        </div>
      </div>

      {/* ── Grilla de Productos ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-72 bg-muted/40" />
          ))}
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="text-center py-16 space-y-3 border rounded-xl bg-card">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
          <h3 className="text-lg font-semibold">No se encontraron productos</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otro segmento crediticio.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setSelectedSegmentoId(null)
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProductos.map((producto) => (
            <Card
              key={producto.id}
              className="flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-primary/40 group overflow-hidden border-border/80"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs font-medium truncate max-w-[170px]">
                    {producto.segmentoNombre}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    {producto.tipoCreditoNombre}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                  {producto.nombre}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {producto.descripcion || 'Crédito con condiciones competitivas y desembolso ágil.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 py-2 flex-1">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      Monto de crédito
                    </span>
                    <p className="font-bold text-sm font-mono text-foreground">
                      ${producto.montoMin.toLocaleString()} - ${producto.montoMax.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Plazo máximo
                    </span>
                    <p className="font-bold text-sm font-mono text-foreground">
                      Hasta {producto.plazoMaxMeses} meses
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">Requisito de garantía:</span>
                  {producto.requiereGarante ? (
                    <span className="flex items-center gap-1 font-medium text-amber-600">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Requiere Garante
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-medium text-emerald-600">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Sin Garante
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t">
                <Button
                  className="w-full group-hover:bg-primary"
                  onClick={() => navigate('/creditos/simular', { state: { productoId: producto.id } })}
                >
                  <span>Simular este Crédito</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
