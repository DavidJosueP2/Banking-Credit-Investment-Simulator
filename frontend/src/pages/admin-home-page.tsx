import { CircleCheckBig } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'

export function AdminHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel administrativo"
        description="Estructura inicial para alojar los módulos de gestión cuando se conecten los servicios del backend."
        actions={
          <Button asChild variant="outline">
            <Link to="/dev/table">Revisar tabla base</Link>
          </Button>
        }
      />

      <section className="flex max-w-3xl items-start gap-3 rounded-xl border bg-card p-5">
        <CircleCheckBig
          className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-lg">Estructura preparada</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            El layout, el enrutamiento y los componentes reutilizables están
            disponibles. Esta pantalla no contiene lógica financiera ni datos
            reales.
          </p>
        </div>
      </section>
    </div>
  )
}
