import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/admin-layout'
import { AdminHomePage } from '@/pages/admin-home-page'
import { DevTablePage } from '@/pages/dev-table-page'
import { HomePage } from '@/pages/home-page'
import { PlaceholderPage } from '@/pages/placeholder-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminHomePage />,
      },
      {
        path: 'creditos',
        element: (
          <PlaceholderPage
            title="Créditos"
            description="Espacio reservado para la futura administración de productos de crédito."
          />
        ),
      },
      {
        path: 'inversiones',
        element: (
          <PlaceholderPage
            title="Inversiones"
            description="Espacio reservado para el futuro módulo administrativo de inversiones."
          />
        ),
      },
      {
        path: 'configuracion',
        element: (
          <PlaceholderPage
            title="Administración"
            description="Espacio reservado para la futura configuración general del sistema."
          />
        ),
      },
    ],
  },
  {
    path: '/dev/table',
    element: <DevTablePage />,
  },
])
