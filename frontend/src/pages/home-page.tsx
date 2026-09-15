import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <Badge className="mb-2 w-fit" variant="secondary">
            Base técnica preparada
          </Badge>
          <CardTitle>Sistema financiero</CardTitle>
          <CardDescription>
            Estructura inicial para los módulos públicos, de clientes y de
            administración.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Las funcionalidades financieras se incorporarán en las siguientes
          etapas del proyecto.
        </CardContent>
      </Card>
    </main>
  )
}
