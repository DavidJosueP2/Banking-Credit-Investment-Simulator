export const roles = [
  'visitor',
  'client',
  'credit_advisor',
  'investment_advisor',
  'administrator',
] as const

export type Role = (typeof roles)[number]

export const roleLabels: Record<Role, string> = {
  visitor: 'Visitante',
  client: 'Cliente',
  credit_advisor: 'Asesor de crédito',
  investment_advisor: 'Asesor de inversiones',
  administrator: 'Administrador',
}

export const permissions = [
  { key: 'credit.simulate', label: 'Simular créditos', area: 'Público' },
  { key: 'investment.simulate', label: 'Simular inversiones', area: 'Público' },
  { key: 'simulation.report.download', label: 'Descargar reportes de simulación', area: 'Público' },
  { key: 'investment.request.create', label: 'Solicitar una inversión', area: 'Cliente' },
  { key: 'identity.verification.start', label: 'Iniciar verificación de identidad', area: 'Cliente' },
  { key: 'investment.documents.upload', label: 'Subir documentos de inversión', area: 'Cliente' },
  { key: 'own.requests.read', label: 'Consultar solicitudes propias', area: 'Cliente' },
  { key: 'admin.dashboard.view', label: 'Entrar al panel interno', area: 'Panel interno' },
  { key: 'credit.products.manage', label: 'Gestionar tipos y tasas de crédito', area: 'Créditos' },
  { key: 'credit.charges.manage', label: 'Gestionar cobros indirectos', area: 'Créditos' },
  { key: 'credit.requests.review', label: 'Revisar solicitudes de crédito', area: 'Créditos' },
  { key: 'investment.products.manage', label: 'Gestionar productos y tasas de inversión', area: 'Inversiones' },
  { key: 'investment.requests.review', label: 'Revisar solicitudes de inversión', area: 'Inversiones' },
  { key: 'institution.manage', label: 'Configurar la institución', area: 'Administración' },
  { key: 'users.roles.manage', label: 'Asignar roles y permisos', area: 'Administración' },
] as const

export type Permission = (typeof permissions)[number]['key']

const publicPermissions: Permission[] = [
  'credit.simulate',
  'investment.simulate',
  'simulation.report.download',
]

const clientPermissions: Permission[] = [
  ...publicPermissions,
  'investment.request.create',
  'identity.verification.start',
  'investment.documents.upload',
  'own.requests.read',
]

const creditAdvisorPermissions: Permission[] = [
  ...publicPermissions,
  'admin.dashboard.view',
  'credit.products.manage',
  'credit.charges.manage',
  'credit.requests.review',
]

const investmentAdvisorPermissions: Permission[] = [
  ...publicPermissions,
  'admin.dashboard.view',
  'investment.products.manage',
  'investment.requests.review',
]

export const rolePermissions: Record<Role, readonly Permission[]> = {
  visitor: publicPermissions,
  client: clientPermissions,
  credit_advisor: creditAdvisorPermissions,
  investment_advisor: investmentAdvisorPermissions,
  administrator: [
    ...publicPermissions,
    'admin.dashboard.view',
    'credit.products.manage',
    'credit.charges.manage',
    'credit.requests.review',
    'investment.products.manage',
    'investment.requests.review',
    'institution.manage',
    'users.roles.manage',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission)
}
