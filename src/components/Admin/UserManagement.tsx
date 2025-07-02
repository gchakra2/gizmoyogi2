import { useState, useEffect } from 'react'
import { Users, Mail, Calendar, Shield, Search, Filter, MoreVertical, Ban, CheckCircle } from 'lucide-react'
import { Button } from '../UI/Button'
import { LoadingSpinner } from '../UI/LoadingSpinner'
import { supabase } from '../../lib/supabase'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  user_metadata?: {
    full_name?: string
    phone?: string
  }
  bookings_count?: number
  queries_count?: number
  is_admin?: boolean
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'admins' | 'regular'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      await fetchUsersFromBookings()
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersFromBookings = async () => {
    try {
      // Get unique users from bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })

      // Get unique users from queries
      const { data: queries } = await supabase
        .from('yoga_queries')
        .select('email, name, created_at')
        .order('created_at', { ascending: false })

      // Get admin users
      const { data: adminUsers } = await supabase
        .from('admin_users')
        .select('email, role')

      const adminEmails = new Set(adminUsers?.map(admin => admin.email) || [])

      // Combine and deduplicate users
      const userMap = new Map()

      bookings?.forEach(booking => {
        if (booking.email && !userMap.has(booking.email)) {
          userMap.set(booking.email, {
            id: booking.user_id || `booking-${booking.email}`,
            email: booking.email,
            created_at: booking.created_at,
            user_metadata: {
              full_name: `${booking.first_name} ${booking.last_name}`.trim()
            },
            bookings_count: 0,
            queries_count: 0,
            is_admin: adminEmails.has(booking.email)
          })
        }
      })

      queries?.forEach(query => {
        if (query.email && !userMap.has(query.email)) {
          userMap.set(query.email, {
            id: `query-${query.email}`,
            email: query.email,
            created_at: query.created_at,
            user_metadata: {
              full_name: query.name
            },
            bookings_count: 0,
            queries_count: 0,
            is_admin: adminEmails.has(query.email)
          })
        }
      })

      // Count bookings and queries for each user
      for (const [email, user] of userMap) {
        const bookingsCount = bookings?.filter(b => b.email === email).length || 0
        const queriesCount = queries?.filter(q => q.email === email).length || 0
        
        user.bookings_count = bookingsCount
        user.queries_count = queriesCount
      }

      setUsers(Array.from(userMap.values()))
    } catch (error) {
      console.error('Error fetching users from bookings:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'admins' && user.is_admin) ||
      (filterBy === 'regular' && !user.is_admin)
    
    return matchesSearch && matchesFilter
  })

  const handleMakeAdmin = async (userEmail: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .insert([{ email: userEmail, role: 'admin' }])

      if (error) throw error

      await fetchUsers()
      alert('User has been made an admin successfully!')
    } catch (error) {
      console.error('Error making user admin:', error)
      alert('Failed to make user admin')
    }
  }

  const handleRemoveAdmin = async (userEmail: string) => {
    if (!confirm('Are you sure you want to remove admin privileges from this user?')) return

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('email', userEmail)

      if (error) throw error

      await fetchUsers()
      alert('Admin privileges removed successfully!')
    } catch (error) {
      console.error('Error removing admin privileges:', error)
      alert('Failed to remove admin privileges')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const UserDetailsModal = ({ user, onClose }: { user: User, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="sr-only">Close</span>
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <p className="text-gray-900">{user.user_metadata?.full_name || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <p className="text-gray-900">{user.user_metadata?.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user.is_admin ? 'Admin' : 'User'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <p className="text-gray-900">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Sign In</label>
              <p className="text-gray-900">
                {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{user.bookings_count}</div>
              <div className="text-sm text-blue-800">Total Bookings</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{user.queries_count}</div>
              <div className="text-sm text-green-800">Total Queries</div>
            </div>
          </div>

          <div className="flex space-x-3">
            {user.is_admin ? (
              <Button
                onClick={() => handleRemoveAdmin(user.email)}
                variant="outline"
                className="flex items-center"
              >
                <Ban className="w-4 h-4 mr-2" />
                Remove Admin
              </Button>
            ) : (
              <Button
                onClick={() => handleMakeAdmin(user.email)}
                className="flex items-center"
              >
                <Shield className="w-4 h-4 mr-2" />
                Make Admin
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="text-sm text-gray-600">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
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
                placeholder="Search users by email or name..."
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
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Users</option>
                <option value="regular">Regular Users</option>
                <option value="admins">Admins</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
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
                          <div className="text-sm font-medium text-gray-900">
                            {user.user_metadata?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-4">
                        <span>{user.bookings_count} bookings</span>
                        <span>{user.queries_count} queries</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserDetails(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {user.is_admin ? (
                          <button
                            onClick={() => handleRemoveAdmin(user.email)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove Admin"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMakeAdmin(user.email)}
                            className="text-green-600 hover:text-green-900"
                            title="Make Admin"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
                {searchTerm || filterBy !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No users have signed up yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}