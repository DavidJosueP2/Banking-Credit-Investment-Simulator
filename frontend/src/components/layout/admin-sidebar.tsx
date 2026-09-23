import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronsUpDown,
  Landmark,
  LayoutDashboard,
  LogOut,
  Settings2,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { type Permission } from '@/app/access/permissions'
import { useAuth } from '@/app/providers/auth-provider'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

type NavItem = {
  title: string
  url: string
  icon: typeof LayoutDashboard
  exact?: boolean
  permission: Permission
}

const mainNavItems: NavItem[] = [
  { title: 'Inicio', url: '/admin', icon: LayoutDashboard, exact: true, permission: 'admin.dashboard.view' },
  { title: 'Créditos', url: '/admin/creditos', icon: Landmark, permission: 'credit.products.manage' },
  { title: 'Inversiones', url: '/admin/inversiones', icon: ChartNoAxesCombined, permission: 'investment.products.manage' },
]

const adminNavItems: NavItem[] = [
  { title: 'Configuración', url: '/admin/configuracion', icon: Settings2, permission: 'institution.manage' },
  { title: 'Roles y permisos', url: '/admin/roles', icon: UsersRound, permission: 'users.roles.manage' },
]

const accountRoleLabels: Record<string, string> = {
  administrator: 'Administrador',
  credit_advisor: 'Asesor de crédito',
  investment_advisor: 'Asesor de inversiones',
  client: 'Cliente',
}

function accountInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('es-EC')).join('') || 'U'
}

function SidebarNavGroup({ label, items, location, hasPermission }: {
  label: string
  items: NavItem[]
  location: { pathname: string }
  hasPermission: (permission: Permission) => boolean
}) {
  const visibleItems = items.filter((item) => hasPermission(item.permission))
  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-brand-gold">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.url
              : location.pathname.startsWith(item.url)

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <NavLink to={item.url} end={item.exact}>
                    <item.icon className="text-brand-teal" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function SidebarPromoCard() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="mx-2 mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 group-data-[collapsible=icon]:hidden">
      <div className="mb-2 flex items-start justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-semibold text-brand-teal-foreground">
          <Sparkles className="size-3" aria-hidden="true" />
          Nuevo
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-0.5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          aria-label="Cerrar"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-sm font-medium text-sidebar-foreground">Simulador de inversiones</p>
      <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">
        Proyecta rendimientos con diferentes plazos y tasas desde tu panel.
      </p>
      <Link
        to="/inversiones/simulador"
        className="mt-2.5 inline-flex items-center gap-1 rounded-md border border-sidebar-border px-2.5 py-1 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent"
      >
        Probar <ArrowUpRight className="size-3" aria-hidden="true" />
      </Link>
    </div>
  )
}

export function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { account, hasPermission, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const roleText = account?.roles.map((role) => accountRoleLabels[role] ?? role).join(', ') ?? ''

  async function signOut() {
    setSigningOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      toast.error('No se pudo cerrar la sesión. Intenta de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Brunexa Bank" className="justify-start px-2 hover:bg-transparent group-data-[collapsible=icon]:justify-center">
              <Link to="/admin" aria-label="Brunexa Bank, panel administrativo" className="flex w-full items-center justify-start">
                <BrandLogo
                  variant="mark"
                  className="hidden size-8 group-data-[collapsible=icon]:block"
                  decorative
                />
                <BrandLogo
                  className="h-9 w-36 group-data-[collapsible=icon]:hidden [&_img]:object-left"
                  decorative
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavGroup
          label="Navegación"
          items={mainNavItems}
          location={location}
          hasPermission={hasPermission}
        />
        <SidebarNavGroup
          label="Administración"
          items={adminNavItems}
          location={location}
          hasPermission={hasPermission}
        />
      </SidebarContent>

      <SidebarPromoCard />

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  aria-label={`Abrir menú de cuenta de ${account?.fullName ?? 'Usuario'}`}
                  className="justify-center data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-9 group-data-[collapsible=icon]:size-8">
                    <AvatarFallback className="bg-sidebar-accent font-medium text-brand-teal">
                      {accountInitials(account?.fullName ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                    <span className="block truncate font-medium" title={account?.fullName}>{account?.fullName}</span>
                    <span className="block truncate text-xs text-sidebar-foreground/70" title={roleText}>{roleText}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              >
                <DropdownMenuItem asChild>
                  <Link to="/cuenta">
                    <UserRound className="text-brand-teal" aria-hidden="true" />
                    Mi cuenta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={signingOut}
                  onSelect={() => void signOut()}
                >
                  <LogOut aria-hidden="true" />
                  {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
