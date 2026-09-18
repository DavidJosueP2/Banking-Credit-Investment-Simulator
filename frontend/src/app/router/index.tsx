import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/home-page'
import { LoginPage } from '@/pages/auth/login-page'
import { SimuladorPage } from '@/pages/creditos/simulador-page'
import { InstitucionPage } from '@/pages/admin/institucion-page'
import { AppLayout } from '@/components/shared/layout'
import { ProtectedRoute } from '@/features/auth/components/protected-route'

export const router = createBrowserRouter([
  // ── Pública / Landing ──────────────────────────────────────────────────────
  {
    path: '/',
    element: <LandingPage />,
  },

  // ── Autenticación ──────────────────────────────────────────────────────────
  {
    path: '/auth/login',
    element: <LoginPage />,
  },

  // ── Créditos (público — sin sidebar) ──────────────────────────────────────
  {
    path: '/creditos',
    element: <AppLayout />,
    children: [
      {
        path: 'simular',
        element: <SimuladorPage />,
      },
    ],
  },

  // ── Administración (protegida — ADMIN / ASESOR) ───────────────────────────
  {
    path: '/admin',
    element: <ProtectedRoute roles={['ADMIN', 'ASESOR']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: 'institucion',
            element: <InstitucionPage />,
          },
          // Los módulos de créditos de admin se irán agregando aquí
          // {
          //   path: 'creditos/segmentos',
          //   element: <SegmentosPage />,
          // },
        ],
      },
    ],
  },
])
