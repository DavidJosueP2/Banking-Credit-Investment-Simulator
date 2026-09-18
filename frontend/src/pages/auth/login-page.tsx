import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Lock, Mail, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/context/auth-context'
import { api } from '@/lib/api'
import { type AuthResponse } from '@/types'
import { useInstitution } from '@/features/institucion/hooks/use-institution'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { data: institucion } = useInstitution()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (dto: FormData) => {
    setLoading(true)
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', dto)
      login(data)
      toast.success(`Bienvenido, ${data.nombre}`)
      navigate(data.rol === 'CLIENTE' ? '/' : '/admin/institucion')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            {institucion?.logoUrl
              ? <img src={institucion.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
              : <Building2 className="w-7 h-7 text-primary" />
            }
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {institucion?.nombreComercial ?? institucion?.nombre ?? 'Plataforma Financiera'}
          </h1>
          <p className="text-muted-foreground text-sm">Inicia sesión para continuar</p>
        </div>

        {/* Card de login */}
        <Card className="shadow-lg border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales de acceso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className="pl-9"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link to="/auth/register" className="text-primary hover:underline font-medium">
                Regístrate
              </Link>
            </div>
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Acceso público al{' '}
              <Link to="/creditos/simular" className="text-primary hover:underline">
                simulador de créditos
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
