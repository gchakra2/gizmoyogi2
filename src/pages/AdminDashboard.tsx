import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  LogOut,
  BookOpen,
  MessageCircle,
  Mail,
  Users
} from 'lucide-react'
import { Button } from '../components/UI/Button'
import { LoadingSpinner } from '../components/UI/LoadingSpinner'
import { ArticleManagement } from '../components/Admin/ArticleManagement'
import { BookingManagement } from '../components/Admin/BookingManagement'
import { UserManagement } from '../components/Admin/UserManagement'
import { useAdmin } from '../contexts/AdminContext'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  totalBookings: number
  totalQueries: number
  totalContacts: number
  totalArticles: number
  publishedArticles: number
  totalViews: number
  totalUsers: number
  recentBookings: any[]
  pendingQueries: any[]
  newContacts: any[]
  allQueries: any[]
  allContacts: any[]
  allBookings: any[]
}

export function AdminDashboard() {
  const { admin, isAdmin, signOutAdmin } = useAdmin()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login')
      return
    }
    fetchDashboardData()
  }, [isAdmin, navigate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Use service role or bypass RLS for admin queries
      await supabase.auth.getSession()
      
      // Fetch all data in parallel with proper error handling
      const [bookingsRes, queriesRes, contactsRes, articlesRes, viewsRes] = await Promise.allSettled([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('yoga_queries').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('articles').select('*').order('created_at', { ascending: false }),
        supabase.from('article_views').select('*')
      ])

      console.log('Fetch results:', {
        bookings: bookingsRes,
        queries: queriesRes,
        contacts: contactsRes,
        articles: articlesRes,
        views: viewsRes
      })

      // Extract data with fallbacks
      const bookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data || []) : []
      const queries = queriesRes.status === 'fulfilled' ? (queriesRes.value.data || []) : []
      const contacts = contactsRes.status === 'fulfilled' ? (contactsRes.value.data || []) : []
      const articles = articlesRes.status === 'fulfilled' ? (articlesRes.value.data || []) : []
      const views = viewsRes.status === 'fulfilled' ? (viewsRes.value.data || []) : []

      // Log any errors
      if (bookingsRes.status === 'rejected') console.error('Bookings error:', bookingsRes.reason)
      if (queriesRes.status === 'rejected') console.error('Queries error:', queriesRes.reason)
      if (contactsRes.status === 'rejected') console.error('Contacts error:', contactsRes.reason)
      if (articlesRes.status === 'rejected') console.error('Articles error:', articlesRes.reason)
      if (viewsRes.status === 'rejected') console.error('Views error:', viewsRes.reason)

      console.log('Processed data:', {
        bookings: bookings.length,
        queries: queries.length,
        contacts: contacts.length,
        articles: articles.length,
        views: views.length
      })

      // Filter pending queries and new contacts
      const pendingQueries = queries.filter(q => q.status === 'pending')
      const newContacts = contacts.filter(c => c.status === 'new')

      // Get unique users count from bookings and queries
      const uniqueEmails = new Set([
        ...bookings.map(b => b.email),
        ...queries.map(q => q.email)
      ])

      console.log('Filtered data:', {
        pendingQueries: pendingQueries.length,
        newContacts: newContacts.length,
        totalQueries: queries.length,
        totalContacts: contacts.length,
        totalUsers: uniqueEmails.size
      })

      setStats({
        totalBookings: bookings.length,
        totalQueries: queries.length,
        totalContacts: contacts.length,
        totalArticles: articles.length,
        publishedArticles: articles.filter(a => a.status === 'published').length,
        totalViews: views.length,
        totalUsers: uniqueEmails.size,
        recentBookings: bookings.slice(0, 5),
        pendingQueries: pendingQueries.slice(0, 10),
        newContacts: newContacts.slice(0, 10),
        allQueries: queries,
        allContacts: contacts,
        allBookings: bookings
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOutAdmin()
    navigate('/')
  }

  const handleUpdateQueryStatus = async (queryId: string, status: string, response?: string) => {
    try {
      const updateData: any = { status }
      if (response) {
        updateData.response = response
        updateData.responded_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('yoga_queries')
        .update(updateData)
        .eq('id', queryId)

      if (error) throw error

      // Refresh data
      await fetchDashboardData()
      alert('Query updated successfully!')
    } catch (error) {
      console.error('Error updating query:', error)
      alert('Failed to update query')
    }
  }

  const handleUpdateContactStatus = async (contactId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', contactId)

      if (error) throw error

      // Refresh data
      await fetchDashboardData()
      alert('Contact status updated successfully!')
    } catch (error) {
      console.error('Error updating contact:', error)
      alert('Failed to update contact status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <Users className="w-8 h-8 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: <Calendar className="w-8 h-8 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'Yoga Queries',
      value: stats.totalQueries,
      icon: <MessageCircle className="w-8 h-8 text-green-600" />,
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Contact Messages',
      value: stats.totalContacts,
      icon: <Mail className="w-8 h-8 text-orange-600" />,
      color: 'bg-orange-50 border-orange-200'
    },
    {
      title: 'Published Articles',
      value: stats.publishedArticles,
      icon: <BookOpen className="w-8 h-8 text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-200'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {admin?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <span>View Site</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users' },
              { id: 'bookings', label: 'Bookings' },
              { id: 'articles', label: 'Articles' },
              { id: 'queries', label: 'Yoga Queries' },
              { id: 'contacts', label: 'Contact Messages' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.id === 'queries' && stats.pendingQueries.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {stats.pendingQueries.length}
                  </span>
                )}
                {tab.id === 'contacts' && stats.newContacts.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {stats.newContacts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {statCards.map((stat, index) => (
                <div key={index} className={`card p-6 border-2 ${stat.color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    {stat.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Bookings */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                <div className="space-y-3">
                  {stats.recentBookings.length > 0 ? (
                    stats.recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
                          <p className="text-sm text-gray-600">{booking.class_name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No recent bookings</p>
                  )}
                  {stats.totalBookings > 5 && (
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all {stats.totalBookings} bookings →
                    </button>
                  )}
                </div>
              </div>

              {/* Pending Queries */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pending Queries ({stats.pendingQueries.length})
                </h3>
                <div className="space-y-3">
                  {stats.pendingQueries.length > 0 ? (
                    stats.pendingQueries.slice(0, 3).map((query) => (
                      <div key={query.id} className="p-3 bg-orange-50 rounded-lg">
                        <p className="font-medium text-gray-900">{query.name}</p>
                        <p className="text-sm text-gray-600 truncate">{query.subject}</p>
                        <p className="text-xs text-orange-600 mt-1">Needs response</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No pending queries</p>
                  )}
                  {stats.pendingQueries.length > 3 && (
                    <button
                      onClick={() => setActiveTab('queries')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all pending queries →
                    </button>
                  )}
                </div>
              </div>

              {/* New Contacts */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  New Contact Messages ({stats.newContacts.length})
                </h3>
                <div className="space-y-3">
                  {stats.newContacts.length > 0 ? (
                    stats.newContacts.slice(0, 3).map((contact) => (
                      <div key={contact.id} className="p-3 bg-purple-50 rounded-lg">
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-600 truncate">{contact.subject}</p>
                        <p className="text-xs text-purple-600 mt-1">New message</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No new contact messages</p>
                  )}
                  {stats.newContacts.length > 3 && (
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all contacts →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'bookings' && <BookingManagement />}
        {activeTab === 'articles' && <ArticleManagement />}

        {activeTab === 'queries' && (
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Yoga Queries ({stats.allQueries.length} total)
            </h2>
            <div className="space-y-4">
              {stats.allQueries.length > 0 ? (
                stats.allQueries.map((query) => (
                  <div key={query.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{query.subject}</h3>
                        <p className="text-sm text-gray-600">From: {query.name} ({query.email})</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          query.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {query.status}
                        </span>
                        {query.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const response = prompt('Enter your response:')
                              if (response) {
                                handleUpdateQueryStatus(query.id, 'responded', response)
                              }
                            }}
                          >
                            Respond
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{query.message}</p>
                    {query.response && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium">Response:</p>
                        <p className="text-sm text-blue-800">{query.response}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                      <span>Category: {query.category}</span>
                      <span>Experience: {query.experience_level}</span>
                      <span>{new Date(query.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No yoga queries found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Contact Messages ({stats.allContacts.length} total)
            </h2>
            <div className="space-y-4">
              {stats.allContacts.length > 0 ? (
                stats.allContacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{contact.subject}</h3>
                        <p className="text-sm text-gray-600">From: {contact.name} ({contact.email})</p>
                        {contact.phone && <p className="text-sm text-gray-600">Phone: {contact.phone}</p>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          contact.status === 'new' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contact.status}
                        </span>
                        {contact.status === 'new' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateContactStatus(contact.id, 'read')}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{contact.message}</p>
                    <div className="text-sm text-gray-500">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No contact messages found</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}