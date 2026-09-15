import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'

import { roles, type Role } from '@/app/access/permissions'

const STORAGE_KEY = 'brunexa-demo-role'

const DemoAccessContext = createContext<{
  role: Role
  setRole: (role: Role) => void
} | null>(null)

function getInitialRole(): Role {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (roles.some((role) => role === stored)) return stored as Role
  } catch {
    // Preview remains available without storage.
  }

  return 'administrator'
}

export function DemoAccessProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role>(getInitialRole)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, role)
    } catch {
      // Preview remains available without storage.
    }
  }, [role])

  return (
    <DemoAccessContext.Provider value={{ role, setRole }}>
      {children}
    </DemoAccessContext.Provider>
  )
}

export function useDemoAccess() {
  const context = useContext(DemoAccessContext)
  if (!context) throw new Error('useDemoAccess debe usarse dentro de DemoAccessProvider')
  return context
}
