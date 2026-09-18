import { Menu, Sun, Moon, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/context/auth-context'
import { useInstitution } from '@/features/institucion/hooks/use-institution'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface NavbarProps {
  onMenuClick: () => void
}

export function AppNavbar({ onMenuClick }: NavbarProps) {
  const { usuario, logout } = useAuth()
  const { data: institucion } = useInstitution()
  const navigate = useNavigate()
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 flex items-center px-4 gap-3 shrink-0">
      {/* Hamburger */}
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </Button>

      {/* Logo / nombre institución */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {institucion?.logoUrl ? (
          <img
            src={institucion.logoUrl}
            alt="Logo"
            className="h-8 w-8 object-contain rounded"
          />
        ) : null}
        <span className="font-semibold text-sm text-foreground truncate">
          {institucion?.nombreComercial ?? institucion?.nombre ?? 'Plataforma Financiera'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle dark */}
        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Menú de usuario */}
        {usuario ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {usuario.nombre.charAt(0)}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="font-medium">{usuario.nombre} {usuario.apellido}</p>
                <p className="text-xs text-muted-foreground font-normal">{usuario.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <User className="w-4 h-4 mr-2" /> Mi perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" onClick={() => navigate('/auth/login')}>
            Iniciar sesión
          </Button>
        )}
      </div>
    </header>
  )
}
