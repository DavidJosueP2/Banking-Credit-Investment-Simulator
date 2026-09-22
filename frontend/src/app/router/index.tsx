import { Suspense, lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/admin-layout'
import { PublicLayout } from '@/components/layout/public-layout'
import { PermissionGate } from '@/components/shared/permission-gate'
import { AdminHomePage } from '@/pages/admin-home-page'
import { AccountPage } from '@/pages/account-page'
import { DevTablePage } from '@/pages/dev-table-page'
import { HomePage } from '@/pages/home-page'
import { InstitutionSettingsPage } from '@/pages/institution-settings-page'
import { InvestmentAdminPage, InvestmentProductEditorPage } from '@/pages/investment-admin-page'
import { InvestmentSimulatorPage } from '@/pages/investment-simulator-page'
import { LoginPage } from '@/pages/login-page'
import { ProfilePage } from '@/pages/profile-page'
import { RegistrationPage } from '@/pages/registration-page'
import { RolePermissionsPage } from '@/pages/role-permissions-page'
import { SimuladorClientePage } from '@/pages/creditos/simulador-cliente-page'
import { ConfiguradorCreditoPage } from '@/pages/admin/creditos/configurador-credito-page'

const LivenessDevPage = lazy(() => import('@/pages/liveness-dev-page')
  .then((module) => ({ default: module.LivenessDevPage })))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'registro', element: <RegistrationPage /> },
      { path: 'cuenta', element: <AccountPage /> },
      {
        path: 'perfil',
        element: (
          <PermissionGate permission="identity.verification.start">
            <ProfilePage />
          </PermissionGate>
        ),
      },
      {
        path: 'dev/liveness',
        element: (
          <PermissionGate permission="identity.verification.start">
            <Suspense fallback={<div className="px-5 py-16 text-sm text-muted-foreground">Cargando prueba de vida…</div>}>
              <LivenessDevPage />
            </Suspense>
          </PermissionGate>
        ),
      },
      { path: 'inversiones/simulador', element: <InvestmentSimulatorPage /> },
      { path: 'simulador', element: <SimuladorClientePage /> },
    ],
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
            <ConfiguradorCreditoPage />
          </PermissionGate>
        ),
      },
      {
        path: 'configuracion-creditos',
        element: (
          <PermissionGate permission="credit.products.manage">
            <ConfiguradorCreditoPage />
          </PermissionGate>
        ),
      },
      {
        path: 'inversiones',
        element: (
          <PermissionGate permission="investment.products.manage">
            <InvestmentAdminPage />
          </PermissionGate>
        ),
      },
      {
        path: 'inversiones/nuevo',
        element: (
          <PermissionGate permission="investment.products.manage">
            <InvestmentProductEditorPage />
          </PermissionGate>
        ),
      },
      {
        path: 'inversiones/:productId/editar',
        element: (
          <PermissionGate permission="investment.products.manage">
            <InvestmentProductEditorPage />
          </PermissionGate>
        ),
      },
      {
        path: 'configuracion',
        element: (
          <PermissionGate permission="institution.manage">
            <InstitutionSettingsPage />
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
    element: <PermissionGate permission="admin.dashboard.view"><DevTablePage /></PermissionGate>,
  },
])
