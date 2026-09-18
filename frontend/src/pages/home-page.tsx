import { Link } from 'react-router-dom'
import { Calculator, TrendingUp, Shield, Building2, ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useInstitution } from '@/features/institucion/hooks/use-institution'

export function LandingPage() {
  const { data: institucion } = useInstitution()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar mínima */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {institucion?.logoUrl ? (
              <img src={institucion.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-foreground">
              {institucion?.nombreComercial ?? institucion?.nombre ?? 'Plataforma Financiera'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/creditos/simular">Simulador</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center space-y-6">
        <Badge variant="secondary" className="text-xs px-3 py-1">
          <Star className="w-3 h-3 mr-1.5" />
          Plataforma financiera — Ecuador
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
          Simula y gestiona tus<br />
          <span className="text-primary">créditos e inversiones</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Calcula amortizaciones en sistema francés y alemán, compara tasas del BCE y SEPS,
          y accede a todos los productos financieros disponibles.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/creditos/simular">
              <Calculator className="w-5 h-5 mr-2" />
              Simular crédito
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth/login">
              Acceder a mi cuenta <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Calculator,
              title: 'Simulador avanzado',
              desc: 'Tablas de amortización francesa y alemana. Compara sistemas y elige el más conveniente.',
              href: '/creditos/simular',
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
            },
            {
              icon: TrendingUp,
              title: 'Tasas oficiales BCE',
              desc: 'Tasas activas referenciales y máximas publicadas por el Banco Central del Ecuador y la SEPS.',
              href: '/creditos',
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
            },
            {
              icon: Shield,
              title: 'Seguro y confiable',
              desc: 'Información transparente sobre cargos, seguros, garantías y condiciones de cada producto.',
              href: '/auth/register',
              color: 'text-violet-500',
              bg: 'bg-violet-500/10',
            },
          ].map((f) => (
            <Card key={f.title} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-6 space-y-3">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <Link
                  to={f.href}
                  className={`text-sm font-medium ${f.color} flex items-center gap-1 group-hover:gap-2 transition-all`}
                >
                  Explorar <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>
          {institucion?.nombre ?? 'Plataforma Financiera'} —{' '}
          {institucion?.ciudad && `${institucion.ciudad}, `}Ecuador
        </p>
        {institucion?.email && (
          <p className="mt-1">
            <a href={`mailto:${institucion.email}`} className="hover:text-primary">
              {institucion.email}
            </a>
          </p>
        )}
      </footer>
    </div>
  )
}
