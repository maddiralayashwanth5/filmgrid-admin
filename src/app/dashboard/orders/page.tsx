'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Zap,
  Calendar,
  MapPin,
  IndianRupee,
  MoreVertical,
  XCircle,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Package,
  Phone,
} from 'lucide-react';
import { getOpenOrders, cancelOpenOrder } from '@/lib/firestore';
import type { OpenOrder, OpenOrderStatus } from '@/lib/types';

const statusColors: Record<OpenOrderStatus, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OpenOrderStatus | 'all'>('all');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null);
  const pageSize = 15;

  useEffect(() => {
    const unsubscribe = getOpenOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOpenOrder(orderId);
      setShowMenu(null);
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  // Get counts for each status
  const statusCounts = {
    all: orders.length,
    open: orders.filter(o => o.status === 'open').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    expired: orders.filter(o => o.status === 'expired').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.renterName?.toLowerCase().includes(search.toLowerCase()) ||
      order.category?.toLowerCase().includes(search.toLowerCase()) ||
      order.city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedData = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Open Orders</h1>
        <p className="text-gray-600">Manage equipment rental requests from renters</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Orders</p>
          <p className="text-2xl font-bold text-blue-700">{statusCounts.all}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Open</p>
          <p className="text-2xl font-bold text-yellow-700">{statusCounts.open}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Accepted</p>
          <p className="text-2xl font-bold text-green-700">{statusCounts.accepted}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Expired</p>
          <p className="text-2xl font-bold text-gray-700">{statusCounts.expired}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">Cancelled</p>
          <p className="text-2xl font-bold text-red-700">{statusCounts.cancelled}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by renter, category, or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'accepted', 'expired', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Renter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              paginatedData.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                        {order.renterPhotoUrl ? (
                          <img
                            src={order.renterPhotoUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-orange-600">
                            {order.renterName?.[0]?.toUpperCase() || 'R'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.renterName}</p>
                        <p className="text-xs text-gray-500">{order.renterPhone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{order.category}</p>
                      {order.preferredBrand && (
                        <p className="text-xs text-gray-500">{order.preferredBrand} {order.preferredModel}</p>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {order.city}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm">
                      <p className="text-gray-900">
                        {format(order.startDate, 'MMM d')} - {format(order.endDate, 'MMM d')}
                      </p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 font-medium text-green-600">
                      <IndianRupee className="h-4 w-4" />
                      {order.maxBudgetPerDay?.toLocaleString()}/day
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {format(order.expiresAt, 'MMM d, h:mm a')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === order.id ? null : order.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {showMenu === order.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                          {order.status === 'open' && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" /> Cancel Order
                            </button>
                          )}
                          {order.status !== 'open' && (
                            <p className="px-4 py-2 text-sm text-gray-500">No actions available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length}
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
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                {selectedOrder.status.toUpperCase()}
              </span>
            </div>

            {/* Renter Info */}
            <div className="mb-6 flex items-center gap-4 rounded-lg bg-gray-50 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                {selectedOrder.renterPhotoUrl ? (
                  <img
                    src={selectedOrder.renterPhotoUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-orange-600">
                    {selectedOrder.renterName?.[0]?.toUpperCase() || 'R'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedOrder.renterName}</h3>
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <Phone className="h-4 w-4" /> {selectedOrder.renterPhone}
                </p>
              </div>
            </div>

            {/* Equipment Request */}
            <div className="mb-6 rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-700">
                <Package className="h-5 w-5" /> Equipment Request
              </h4>
              <div className="space-y-2">
                <p><strong>Category:</strong> {selectedOrder.category}</p>
                {selectedOrder.preferredBrand && (
                  <p><strong>Preferred Brand:</strong> {selectedOrder.preferredBrand}</p>
                )}
                {selectedOrder.preferredModel && (
                  <p><strong>Preferred Model:</strong> {selectedOrder.preferredModel}</p>
                )}
                {selectedOrder.description && (
                  <p><strong>Description:</strong> {selectedOrder.description}</p>
                )}
              </div>
            </div>

            {/* Dates & Budget */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-700">
                  <Calendar className="h-4 w-4" /> Rental Period
                </h4>
                <p className="font-medium">
                  {format(selectedOrder.startDate, 'MMM d, yyyy')} - {format(selectedOrder.endDate, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-green-700">
                  <IndianRupee className="h-4 w-4" /> Max Budget
                </h4>
                <p className="text-xl font-bold">₹{selectedOrder.maxBudgetPerDay?.toLocaleString()}/day</p>
              </div>
            </div>

            {/* Location */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-gray-700">
                <MapPin className="h-4 w-4" /> Location
              </h4>
              <p className="font-medium">{selectedOrder.city}</p>
              {selectedOrder.pickupLocation && (
                <p className="text-sm text-gray-600">Pickup: {selectedOrder.pickupLocation}</p>
              )}
            </div>

            {/* Accepted By (if accepted) */}
            {selectedOrder.status === 'accepted' && selectedOrder.acceptedByLenderName && (
              <div className="mb-6 rounded-lg bg-green-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-green-700">
                  <CheckCircle className="h-4 w-4" /> Accepted By
                </h4>
                <p className="font-medium">{selectedOrder.acceptedByLenderName}</p>
                {selectedOrder.acceptedEquipmentTitle && (
                  <p className="text-sm text-green-600">Equipment: {selectedOrder.acceptedEquipmentTitle}</p>
                )}
                {selectedOrder.agreedPricePerDay && (
                  <p className="text-sm text-green-600">Agreed Price: ₹{selectedOrder.agreedPricePerDay}/day</p>
                )}
                {selectedOrder.acceptedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted on {format(selectedOrder.acceptedAt, 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-1 text-sm text-gray-500">
              <p>
                <Clock className="mr-1 inline h-4 w-4" />
                Created: {format(selectedOrder.createdAt, 'MMM d, yyyy h:mm a')}
              </p>
              <p>
                <Clock className="mr-1 inline h-4 w-4" />
                Expires: {format(selectedOrder.expiresAt, 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              {selectedOrder.status === 'open' && (
                <button
                  onClick={() => {
                    handleCancelOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
                >
                  Cancel Order
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
