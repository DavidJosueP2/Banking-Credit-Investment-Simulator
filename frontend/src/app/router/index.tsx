import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/home-page'
import { LoginPage } from '@/pages/auth/login-page'
import { SimuladorPage } from '@/pages/creditos/simulador-page'
import { CatalogoPage } from '@/pages/creditos/catalogo-page'
import { InstitucionPage } from '@/pages/admin/institucion-page'
import { SegmentosPage } from '@/pages/admin/creditos/segmentos-page'
import { TiposPage } from '@/pages/admin/creditos/tipos-page'
import { ProductosPage } from '@/pages/admin/creditos/productos-page'
import { TasasPage } from '@/pages/admin/creditos/tasas-page'
import { RangosPage } from '@/pages/admin/creditos/rangos-page'
import { CargosPage } from '@/pages/admin/creditos/cargos-page'
import { SegurosPage } from '@/pages/admin/creditos/seguros-page'
import { AppLayout } from '@/components/shared/layout'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { RouteErrorBoundary } from '@/components/shared/error-boundary'

export const router = createBrowserRouter([
  // ── Pública / Landing ──────────────────────────────────────────────────────
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <RouteErrorBoundary />,
  },

  // ── Autenticación ──────────────────────────────────────────────────────────
  {
    path: '/auth/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },

  // ── Créditos (público con layout) ──────────────────────────────────────────
  {
    path: '/creditos',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <CatalogoPage />,
      },
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
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: 'institucion',
            element: <InstitucionPage />,
          },
          {
            path: 'creditos/segmentos',
            element: <SegmentosPage />,
          },
          {
            path: 'creditos/tipos',
            element: <TiposPage />,
          },
          {
            path: 'creditos/productos',
            element: <ProductosPage />,
          },
          {
            path: 'creditos/tasas',
            element: <TasasPage />,
          },
          {
            path: 'creditos/rangos',
            element: <RangosPage />,
          },
          {
            path: 'creditos/cargos',
            element: <CargosPage />,
          },
          {
            path: 'creditos/seguros',
            element: <SegurosPage />,
          },
        ],
      },
    ],
  },
  // ── 404 Catch-All ─────────────────────────────────────────────────────────
  {
    path: '*',
    element: <RouteErrorBoundary />,
  },
])
