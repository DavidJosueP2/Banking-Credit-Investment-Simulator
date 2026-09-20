import { PageHeader } from '@/components/shared/page-header'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        Este módulo se implementará en una etapa posterior.
      </div>
    </div>
  )
}
