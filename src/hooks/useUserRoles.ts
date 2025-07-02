import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserRole {
  role_name: string
}

export function useUserRoles(user: User | null) {
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setRoles([])
      setLoading(false)
      return
    }

    fetchUserRoles()
  }, [user])

  const fetchUserRoles = async () => {
    try {
      setLoading(true)
      setError(null)

      // Call the get_user_roles() function
      const { data, error } = await supabase
        .rpc('get_user_roles')

      if (error) throw error

      const roleNames = data?.map((role: UserRole) => role.role_name) || []
      setRoles(roleNames)
    } catch (err: any) {
      console.error('Error fetching user roles:', err)
      setError(err.message)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  const hasRole = (roleName: string): boolean => {
    return roles.includes(roleName)
  }

  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some(roleName => roles.includes(roleName))
  }

  const isAdmin = (): boolean => {
    return hasAnyRole(['admin', 'super_admin'])
  }

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin')
  }

  const assignRole = async (userId: string, roleName: string) => {
    try {
      // Get role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single()

      if (roleError) throw roleError

      // Assign role to user
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role_id: roleData.id
        }])

      if (error) throw error

      // Refresh roles if it's the current user
      if (userId === user?.id) {
        await fetchUserRoles()
      }
    } catch (err: any) {
      console.error('Error assigning role:', err)
      throw err
    }
  }

  const removeRole = async (userId: string, roleName: string) => {
    try {
      // Get role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single()

      if (roleError) throw roleError

      // Remove role from user
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleData.id)

      if (error) throw error

      // Refresh roles if it's the current user
      if (userId === user?.id) {
        await fetchUserRoles()
      }
    } catch (err: any) {
      console.error('Error removing role:', err)
      throw err
    }
  }

  return {
    roles,
    loading,
    error,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    assignRole,
    removeRole,
    refetch: fetchUserRoles
  }
}