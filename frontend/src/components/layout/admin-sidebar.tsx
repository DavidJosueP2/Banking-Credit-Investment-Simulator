import {
  ChartNoAxesCombined,
  Landmark,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { type Permission } from '@/app/access/permissions'
import { useAuth } from '@/app/providers/auth-provider'
import { BrandLogo } from '@/components/shared/brand-logo'
import {
  Sidebar,
  SidebarContent,
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
  { title: 'Créditos', url: '/admin/creditos', icon: Landmark, permission: 'credit.products.manage' },
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

export function AdminSidebar() {
  const location = useLocation()
  const { hasPermission } = useAuth()

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

      <SidebarRail />
    </Sidebar>
  )
}
