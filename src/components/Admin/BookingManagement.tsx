import { useState, useEffect } from 'react'
import { Calendar, User, Clock, Phone, Mail, Search, Filter, CheckCircle, X, AlertCircle } from 'lucide-react'
import { Button } from '../UI/Button'
import { LoadingSpinner } from '../UI/LoadingSpinner'
import { supabase } from '../../lib/supabase'

interface Booking {
  id: string
  user_id?: string
  class_name: string
  instructor: string
  class_date: string
  class_time: string
  first_name: string
  last_name: string
  email: string
  phone: string
  experience_level: string
  special_requests?: string
  emergency_contact: string
  emergency_phone: string
  status: string
  created_at: string
  updated_at: string
}

export function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      setActionLoading(bookingId)
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId)

      if (error) throw error

      await fetchBookings()
      alert(`Booking status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('Failed to update booking status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return

    try {
      setActionLoading(bookingId)
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      await fetchBookings()
      alert('Booking deleted successfully')
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      booking.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'cancelled': return <X className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const BookingDetailsModal = ({ booking, onClose }: { booking: Booking, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="sr-only">Close</span>
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Class Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Class Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Class:</span>
                <p className="text-blue-700">{booking.class_name}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Instructor:</span>
                <p className="text-blue-700">{booking.instructor}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Date:</span>
                <p className="text-blue-700">{formatDate(booking.class_date)}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Time:</span>
                <p className="text-blue-700">{booking.class_time}</p>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Student Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Name:</span>
                <p className="text-green-700">{booking.first_name} {booking.last_name}</p>
              </div>
              <div>
                <span className="font-medium text-green-800">Email:</span>
                <p className="text-green-700">{booking.email}</p>
              </div>
              <div>
                <span className="font-medium text-green-800">Phone:</span>
                <p className="text-green-700">{booking.phone}</p>
              </div>
              <div>
                <span className="font-medium text-green-800">Experience:</span>
                <p className="text-green-700 capitalize">{booking.experience_level}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-orange-800">Name:</span>
                <p className="text-orange-700">{booking.emergency_contact}</p>
              </div>
              <div>
                <span className="font-medium text-orange-800">Phone:</span>
                <p className="text-orange-700">{booking.emergency_phone}</p>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Special Requests</h4>
              <p className="text-purple-700 text-sm">{booking.special_requests}</p>
            </div>
          )}

          {/* Booking Status and Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="font-medium text-gray-700">Current Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Booked on {formatDate(booking.created_at)}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {booking.status !== 'confirmed' && (
                <Button
                  onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                  loading={actionLoading === booking.id}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm
                </Button>
              )}
              {booking.status !== 'completed' && (
                <Button
                  onClick={() => handleStatusUpdate(booking.id, 'completed')}
                  loading={actionLoading === booking.id}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Mark Complete
                </Button>
              )}
              {booking.status !== 'cancelled' && (
                <Button
                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                  loading={actionLoading === booking.id}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => handleDeleteBooking(booking.id)}
                loading={actionLoading === booking.id}
                size="sm"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
        <div className="text-sm text-gray-600">
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
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
                placeholder="Search bookings by name, email, or class..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.first_name} {booking.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {booking.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {booking.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{booking.class_name}</div>
                      <div className="text-sm text-gray-500">Instructor: {booking.instructor}</div>
                      <div className="text-sm text-gray-500 capitalize">Level: {booking.experience_level}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(booking.class_date)}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {booking.class_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking)
                            setShowBookingDetails(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                        {booking.status === 'pending' && (
                          <Button
                            onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                            loading={actionLoading === booking.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Confirm
                          </Button>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button
                            onClick={() => handleStatusUpdate(booking.id, 'completed')}
                            loading={actionLoading === booking.id}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No bookings have been made yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => {
            setShowBookingDetails(false)
            setSelectedBooking(null)
          }}
        />
      )}
    </div>
  )
}