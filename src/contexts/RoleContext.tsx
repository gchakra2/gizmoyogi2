import React, { createContext, useContext } from 'react'
import { useAuth } from './AuthContext'
import { useUserRoles } from '../hooks/useUserRoles'

interface RoleContextType {
  roles: string[]
  loading: boolean
  error: string | null
  hasRole: (roleName: string) => boolean
  hasAnyRole: (roleNames: string[]) => boolean
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
  assignRole: (userId: string, roleName: string) => Promise<void>
  removeRole: (userId: string, roleName: string) => Promise<void>
  refetch: () => Promise<void>
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const roleData = useUserRoles(user)

  return (
    <RoleContext.Provider value={roleData}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRoles() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRoles must be used within a RoleProvider')
  }
  return context
}