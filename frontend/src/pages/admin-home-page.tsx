import { PageHeader } from '@/components/shared/page-header'
import { MockDataTable } from '@/pages/dev-table-page'

export function AdminHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel administrativo"
        description="Vista de ejemplo para explorar los componentes de administración de Brunexa. No contiene datos reales ni acciones persistentes."
      />

      <section className="space-y-5" aria-labelledby="admin-example-title">
        <div className="space-y-2">
          <h2 id="admin-example-title" className="text-xl">Tabla de ejemplo</h2>
          <p className="text-sm text-muted-foreground">
            Registros locales de demostración para probar búsqueda, filtros y paginación.
          </p>
        </div>
        <MockDataTable />
      </section>
    </div>
  )
}
