import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/admin-layout'
import { PermissionGate } from '@/components/shared/permission-gate'
import { AdminHomePage } from '@/pages/admin-home-page'
import { DevTablePage } from '@/pages/dev-table-page'
import { HomePage } from '@/pages/home-page'
import { PlaceholderPage } from '@/pages/placeholder-page'
import { RolePermissionsPage } from '@/pages/role-permissions-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/admin',
    element: (
      <PermissionGate permission="admin.dashboard.view">
        <AdminLayout />
      </PermissionGate>
    ),
    children: [
      {
        index: true,
        element: <AdminHomePage />,
      },
      {
        path: 'creditos',
        element: (
          <PermissionGate permission="credit.products.manage">
            <PlaceholderPage
              title="Créditos"
              description="Espacio reservado para la futura administración de productos de crédito."
            />
          </PermissionGate>
        ),
      },
      {
        path: 'inversiones',
        element: (
          <PermissionGate permission="investment.products.manage">
            <PlaceholderPage
              title="Inversiones"
              description="Espacio reservado para el futuro módulo administrativo de inversiones."
            />
          </PermissionGate>
        ),
      },
      {
        path: 'configuracion',
        element: (
          <PermissionGate permission="institution.manage">
            <PlaceholderPage
              title="Configuración"
              description="Espacio reservado para la futura configuración de Brunexa."
            />
          </PermissionGate>
        ),
      },
      {
        path: 'roles',
        element: (
          <PermissionGate permission="users.roles.manage">
            <RolePermissionsPage />
          </PermissionGate>
        ),
      },
    ],
  },
  {
    path: '/dev/table',
    element: <DevTablePage />,
  },
])
