import { useState, useEffect } from 'react'
import { Shield, Users, Plus, X, Search, Filter } from 'lucide-react'
import { Button } from '../UI/Button'
import { LoadingSpinner } from '../UI/LoadingSpinner'
import { supabase } from '../../lib/supabase'
import { useRoles } from '../../contexts/RoleContext'

interface Role {
  id: string
  name: string
  description: string
}

interface UserWithRoles {
  id: string
  email: string
  roles: string[]
}

export function RoleManagement() {
  const { isSuperAdmin } = useRoles()
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchData()
    }
  }, [isSuperAdmin])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchRoles(), fetchUsersWithRoles()])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (error) throw error
    setRoles(data || [])
  }

  const fetchUsersWithRoles = async () => {
    // Get all users from auth.users (this might need to be done via a function or edge function)
    // For now, we'll get users who have roles assigned
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles(name)
      `)

    if (error) throw error

    // Group by user and collect roles
    const userRoleMap = new Map<string, string[]>()
    data?.forEach(item => {
      const userId = item.user_id
      const roleName = item.roles?.name
      
      if (!userRoleMap.has(userId)) {
        userRoleMap.set(userId, [])
      }
      if (roleName) {
        userRoleMap.get(userId)?.push(roleName)
      }
    })

    // Get user details from auth.users (simplified - in real app you'd need a function)
    const userIds = Array.from(userRoleMap.keys())
    const usersWithRoles: UserWithRoles[] = []

    // This is a simplified approach - in production you'd need an edge function
    // to get user details from auth.users
    for (const userId of userIds) {
      usersWithRoles.push({
        id: userId,
        email: `user-${userId.slice(0, 8)}@example.com`, // Placeholder
        roles: userRoleMap.get(userId) || []
      })
    }

    setUsers(usersWithRoles)
  }

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      const role = roles.find(r => r.name === roleName)
      if (!role) return

      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role_id: role.id
        }])

      if (error) throw error

      await fetchUsersWithRoles()
      alert('Role assigned successfully!')
    } catch (error) {
      console.error('Error assigning role:', error)
      alert('Failed to assign role')
    }
  }

  const handleRemoveRole = async (userId: string, roleName: string) => {
    try {
      const role = roles.find(r => r.name === roleName)
      if (!role) return

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', role.id)

      if (error) throw error

      await fetchUsersWithRoles()
      alert('Role removed successfully!')
    } catch (error) {
      console.error('Error removing role:', error)
      alert('Failed to remove role')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || 
      user.roles.includes(selectedRole)
    
    return matchesSearch && matchesRole
  })

  if (!isSuperAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">Only Super Admins can manage roles.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
        <Button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Role
        </Button>
      </div>

      {/* Available Roles */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-gray-900 capitalize">
                  {role.name.replace('_', ' ')}
                </h4>
              </div>
              <p className="text-sm text-gray-600">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>
                    {role.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users with Roles */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Users and Their Roles</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium capitalize flex items-center"
                        >
                          {role.replace('_', ' ')}
                          <button
                            onClick={() => handleRemoveRole(user.id, role)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowAssignModal(true)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Manage Roles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedRole !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No users have been assigned roles yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser ? `Manage Roles for ${selectedUser.email}` : 'Assign Role'}
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select roles to assign to the user. This feature requires additional implementation
                to work with your user management system.
              </p>
              
              <div className="space-y-2">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <span className="text-sm font-medium capitalize">
                      {role.name.replace('_', ' ')}
                    </span>
                    <Button
                      onClick={() => selectedUser && handleAssignRole(selectedUser.id, role.name)}
                      size="sm"
                      disabled={selectedUser?.roles.includes(role.name)}
                    >
                      {selectedUser?.roles.includes(role.name) ? 'Assigned' : 'Assign'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}