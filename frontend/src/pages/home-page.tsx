import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Link } from 'react-router-dom'

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
        <CardContent className="space-y-5 text-sm text-muted-foreground">
          <p>
            Las funcionalidades financieras se incorporarán en las siguientes
            etapas del proyecto.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/admin">Abrir administración</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dev/table">Ver tabla mock</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
