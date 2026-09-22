import {
  ChartNoAxesCombined,
  ChevronsUpDown,
  Landmark,
  LayoutDashboard,
  LogOut,
  Settings2,
  UserRound,
  UsersRound,
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

const navigationItems = [
  { title: 'Inicio', url: '/admin', icon: LayoutDashboard, exact: true, permission: 'admin.dashboard.view' },
  { title: 'Configuración de Créditos', url: '/admin/creditos', icon: Landmark, permission: 'credit.products.manage' },
  { title: 'Inversiones', url: '/admin/inversiones', icon: ChartNoAxesCombined, permission: 'investment.products.manage' },
  { title: 'Configuración', url: '/admin/configuracion', icon: Settings2, permission: 'institution.manage' },
  { title: 'Roles y permisos', url: '/admin/roles', icon: UsersRound, permission: 'users.roles.manage' },
] satisfies Array<{
  title: string
  url: string
  icon: typeof LayoutDashboard
  exact?: boolean
  permission: Permission
}>

const accountRoleLabels: Record<string, string> = {
  administrator: 'Administrador',
  credit_advisor: 'Asesor de crédito',
  investment_advisor: 'Asesor de inversiones',
  client: 'Cliente',
}

function accountInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('es-EC')).join('') || 'U'
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
      <SidebarHeader className="items-center pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Brunexa Bank" className="justify-center">
              <Link to="/admin" aria-label="Brunexa Bank, panel administrativo">
                <BrandLogo
                  variant="mark"
                  className="hidden size-8 group-data-[collapsible=icon]:block"
                  decorative
                />
                <BrandLogo
                  className="h-11 w-40 group-data-[collapsible=icon]:hidden"
                  decorative
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-brand-gold">Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((item) => hasPermission(item.permission)).map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url)

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="data-[active=true]:text-brand-teal"
                    >
                      <NavLink to={item.url} end={item.exact}>
                        <item.icon className={isActive ? 'text-brand-gold' : 'text-brand-teal'} />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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
