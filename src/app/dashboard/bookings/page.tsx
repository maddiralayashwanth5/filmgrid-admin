'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  IndianRupee,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Clock,
  User,
  Package,
} from 'lucide-react';
import { getBookings, getBookingsByStatus, updateBookingStatus } from '@/lib/firestore';
import type { Booking, BookingStatus } from '@/lib/types';

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState<Booking | null>(null);
  const pageSize = 15;

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getBookings((data) => {
      setBookings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const columns = [
    {
      key: 'equipmentTitle',
      header: 'Equipment',
      render: (booking: Booking) => (
        <div className="flex items-center gap-3">
          {booking.equipmentImage ? (
            <img
              src={booking.equipmentImage}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{booking.equipmentTitle}</p>
            <p className="text-xs text-gray-500">{booking.rentalId || booking.id.slice(0, 8)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'renterName',
      header: 'Renter',
      render: (booking: Booking) => (
        <span className="text-gray-600">{booking.renterName}</span>
      ),
    },
    {
      key: 'ownerName',
      header: 'Owner',
      render: (booking: Booking) => (
        <span className="text-gray-600">{booking.ownerName}</span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (booking: Booking) => (
        <div className="text-sm">
          <p className="text-gray-900">{format(booking.startDate, 'MMM d')} - {format(booking.endDate, 'MMM d, yyyy')}</p>
          <p className="text-gray-500">{booking.totalDays} days</p>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (booking: Booking) => (
        <div className="flex items-center gap-1 font-medium text-gray-900">
          <IndianRupee className="h-4 w-4" />
          {booking.totalAmount.toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (booking: Booking) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[booking.status]}`}>
          {booking.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'otp',
      header: 'OTPs',
      render: (booking: Booking) => (
        <div className="text-xs">
          {booking.pickupOtp && (
            <p className="text-green-600">Pickup: {booking.pickupOtp}</p>
          )}
          {booking.dropoffOtp && (
            <p className="text-blue-600">Dropoff: {booking.dropoffOtp}</p>
          )}
          {!booking.pickupOtp && !booking.dropoffOtp && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (booking: Booking) => (
        <span className="text-gray-600">{format(booking.createdAt, 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (booking: Booking) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(showMenu === booking.id ? null : booking.id);
            }}
            className="rounded p-1 hover:bg-gray-100"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {showMenu === booking.id && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
              <p className="border-b px-4 py-2 text-xs font-medium text-gray-500">Change Status</p>
              {(['pending', 'confirmed', 'active', 'completed', 'cancelled'] as BookingStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(booking.id, status)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    booking.status === status ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Get counts for each status
  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    active: bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
        <p className="text-gray-600">View and manage all bookings</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by equipment or renter..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? status === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : statusColors[status]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(() => {
              let filteredData = bookings.filter((booking) =>
                booking.equipmentTitle?.toLowerCase().includes(search.toLowerCase()) ||
                booking.renterName?.toLowerCase().includes(search.toLowerCase()) ||
                booking.ownerName?.toLowerCase().includes(search.toLowerCase())
              );

              // Apply status filter
              if (statusFilter !== 'all') {
                filteredData = filteredData.filter(b => b.status === statusFilter);
              }

              const totalPages = Math.ceil(filteredData.length / pageSize);
              const startIndex = (currentPage - 1) * pageSize;
              const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

              if (paginatedData.length === 0) {
                return (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                );
              }

              return paginatedData.map((booking) => (
                <tr
                  key={booking.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowDetailsModal(booking)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-6 py-4 text-sm">
                      {column.render ? column.render(booking) : (booking as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ));
            })()}
          </tbody>
        </table>

        {/* Pagination */}
        {(() => {
          let filteredData = bookings.filter((booking) =>
            booking.equipmentTitle?.toLowerCase().includes(search.toLowerCase()) ||
            booking.renterName?.toLowerCase().includes(search.toLowerCase()) ||
            booking.ownerName?.toLowerCase().includes(search.toLowerCase())
          );

          if (statusFilter !== 'all') {
            filteredData = filteredData.filter(b => b.status === statusFilter);
          }

          const totalPages = Math.ceil(filteredData.length / pageSize);

          if (totalPages <= 1) return null;

          return (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Equipment Info */}
            <div className="mb-6 flex items-center gap-4">
              {showDetailsModal.equipmentImage ? (
                <img
                  src={showDetailsModal.equipmentImage}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{showDetailsModal.equipmentTitle}</h3>
                <p className="text-sm text-gray-500">Rental ID: {showDetailsModal.rentalId || showDetailsModal.id}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[showDetailsModal.status]}`}>
                  {showDetailsModal.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Parties */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-gray-700">
                  <User className="h-4 w-4" /> Renter
                </h4>
                <p className="font-medium">{showDetailsModal.renterName}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-gray-700">
                  <User className="h-4 w-4" /> Owner
                </h4>
                <p className="font-medium">{showDetailsModal.ownerName}</p>
              </div>
            </div>

            {/* Dates & Amount */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-700">
                  <Calendar className="h-4 w-4" /> Rental Period
                </h4>
                <p className="font-medium">{format(showDetailsModal.startDate, 'MMM d, yyyy')} - {format(showDetailsModal.endDate, 'MMM d, yyyy')}</p>
                <p className="text-sm text-blue-600">{showDetailsModal.totalDays} days</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-green-700">
                  <IndianRupee className="h-4 w-4" /> Total Amount
                </h4>
                <p className="text-xl font-bold">₹{showDetailsModal.totalAmount.toLocaleString('en-IN')}</p>
                <p className="text-sm text-green-600">₹{showDetailsModal.dailyRate}/day</p>
              </div>
            </div>

            {/* OTPs */}
            {(showDetailsModal.pickupOtp || showDetailsModal.dropoffOtp) && (
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <h4 className="mb-3 font-medium text-gray-700">OTP Codes</h4>
                <div className="grid grid-cols-2 gap-4">
                  {showDetailsModal.pickupOtp && (
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-gray-500">Pickup OTP</p>
                      <p className="font-mono text-2xl font-bold text-green-600">{showDetailsModal.pickupOtp}</p>
                    </div>
                  )}
                  {showDetailsModal.dropoffOtp && (
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-gray-500">Dropoff OTP</p>
                      <p className="font-mono text-2xl font-bold text-blue-600">{showDetailsModal.dropoffOtp}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {showDetailsModal.notes && (
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium text-gray-700">Notes</h4>
                <p className="text-gray-600">{showDetailsModal.notes}</p>
              </div>
            )}

            {/* Created At */}
            <div className="text-sm text-gray-500">
              <Clock className="mr-1 inline h-4 w-4" />
              Created: {format(showDetailsModal.createdAt, 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
