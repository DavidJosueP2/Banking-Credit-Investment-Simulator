// Keys are only used to request a view. The server owns the role-permission matrix.
export type Permission =
  | 'admin.dashboard.view'
  | 'credit.products.manage'
  | 'investment.products.manage'
  | 'institution.manage'
  | 'users.roles.manage'
  | 'identity.verification.start'
