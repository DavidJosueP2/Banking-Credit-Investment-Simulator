import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/context/auth-context'
import {
  Building2, CreditCard, ChevronDown, ChevronRight,
  LayoutDashboard, Settings, TrendingUp, Calculator,
  Layers, Tag, Package, Percent, BarChart2, Shield, DollarSign,
  Users, FileText, X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  label: string
  icon: React.ElementType
  href?: string
  children?: NavItem[]
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    label: 'Inicio',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    label: 'Créditos',
    icon: CreditCard,
    children: [
      { label: 'Catálogo', icon: Package, href: '/creditos' },
      { label: 'Simulador', icon: Calculator, href: '/creditos/simular' },
    ],
  },
  {
    label: 'Administración',
    icon: Settings,
    roles: ['ADMIN', 'ASESOR'],
    children: [
      { label: 'Institución', icon: Building2, href: '/admin/institucion' },
      {
        label: 'Créditos',
        icon: CreditCard,
        children: [
          { label: 'Segmentos', icon: Layers, href: '/admin/creditos/segmentos' },
          { label: 'Tipos', icon: Tag, href: '/admin/creditos/tipos' },
          { label: 'Productos', icon: Package, href: '/admin/creditos/productos' },
          { label: 'Tasas', icon: Percent, href: '/admin/creditos/tasas' },
          { label: 'Rangos', icon: BarChart2, href: '/admin/creditos/rangos' },
          { label: 'Cargos', icon: DollarSign, href: '/admin/creditos/cargos' },
          { label: 'Seguros', icon: Shield, href: '/admin/creditos/seguros' },
        ],
      },
      { label: 'Usuarios', icon: Users, href: '/admin/usuarios', roles: ['ADMIN'] },
      { label: 'Solicitudes', icon: FileText, href: '/admin/solicitudes' },
    ],
  },
  {
    label: 'Inversiones',
    icon: TrendingUp,
    children: [
      { label: 'Catálogo', icon: Package, href: '/inversiones' },
      { label: 'Simulador', icon: Calculator, href: '/inversiones/simular' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function AppSidebar({ open, onClose }: SidebarProps) {
  const { usuario } = useAuth()

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 border-r bg-card shadow-sm',
          'transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden',
        )}
      >
        {/* Logo / Marca */}
        <div className="flex items-center justify-between h-16 px-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground leading-none">Financiero</p>
              <p className="text-xs text-muted-foreground">Ecuador</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavGroup
              key={item.label}
              item={item}
              userRol={usuario?.rol}
            />
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {usuario?.nombre?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{usuario?.nombre ?? 'Invitado'}</p>
              <p className="text-xs text-muted-foreground truncate">{usuario?.rol ?? ''}</p>
            </div>
            {usuario?.rol && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {usuario.rol}
              </Badge>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Componente de grupo de navegación ───────────────────────────────────────

function NavGroup({ item, userRol, depth = 0 }: {
  item: NavItem
  userRol?: string
  depth?: number
}) {
  const location = useLocation()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some(
      (c) => c.href && location.pathname.startsWith(c.href),
    )
  })

  // Filtrar por rol
  if (item.roles && userRol && !item.roles.includes(userRol)) return null

  if (item.href) {
    return (
      <NavLink
        to={item.href}
        end={item.href === '/'}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            depth > 0 && 'pl-6 text-xs',
            isActive
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )
        }
      >
        <item.icon className={cn('shrink-0', depth > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        {item.label}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          depth > 0 && 'pl-6 text-xs',
        )}
      >
        <item.icon className={cn('shrink-0', depth > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
      </button>
      {open && item.children && (
        <div className="mt-0.5 ml-2 border-l pl-1 space-y-0.5">
          {item.children.map((child) => (
            <NavGroup key={child.label} item={child} userRol={userRol} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
