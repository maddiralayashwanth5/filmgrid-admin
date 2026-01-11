'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Radio,
  Camera,
  Users,
  MapPin,
  Clock,
  MoreVertical,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  IndianRupee,
  AlertCircle,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BroadcastRequest {
  id: string;
  type: 'gear' | 'rental' | 'workforce';
  userId: string;
  userName: string;
  category: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  status: 'searching' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'expired';
  timeoutAt?: Date;
  assignedId?: string;
  assignedName?: string;
  createdAt: Date;
  // OTP verification fields
  pickupOtp?: string;
  dropOtp?: string;
  pickupVerified?: boolean;
  dropVerified?: boolean;
  pickupVerifiedAt?: Date;
  dropVerifiedAt?: Date;
}

export default function RequestsPage() {
  const [gearRequests, setGearRequests] = useState<BroadcastRequest[]>([]);
  const [rentalRequests, setRentalRequests] = useState<BroadcastRequest[]>([]);
  const [workforceRequests, setWorkforceRequests] = useState<BroadcastRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'gear' | 'rental' | 'workforce'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BroadcastRequest | null>(null);
  const pageSize = 15;

  useEffect(() => {
    // Gear requests
    const gearQuery = query(collection(db, 'broadcast_gear_requests'), orderBy('createdAt', 'desc'));
    const unsubGear = onSnapshot(gearQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: 'gear' as const,
        userId: doc.data().requesterId || doc.data().userId,
        userName: doc.data().requesterName || doc.data().userName || 'Unknown',
        category: doc.data().title || doc.data().gearCategory || 'Gear Request',
        description: doc.data().description,
        location: doc.data().details?.location || doc.data().location || '',
        startDate: doc.data().startDate?.toDate() || doc.data().createdAt?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || doc.data().expiresAt?.toDate(),
        status: doc.data().status,
        timeoutAt: doc.data().expiresAt?.toDate() || doc.data().timeoutAt?.toDate(),
        assignedId: doc.data().acceptedByLenderId || doc.data().assignedLenderId,
        assignedName: doc.data().acceptedByLenderName || doc.data().assignedLenderName,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        pickupOtp: doc.data().pickupOtp,
        dropOtp: doc.data().dropOtp,
        pickupVerified: doc.data().pickupVerified || false,
        dropVerified: doc.data().dropVerified || false,
        pickupVerifiedAt: doc.data().pickupVerifiedAt?.toDate(),
        dropVerifiedAt: doc.data().dropVerifiedAt?.toDate(),
      }));
      setGearRequests(data);
      console.log('Gear requests loaded:', data.length);
    }, (err) => {
      console.error('Error loading gear requests:', err);
      setError(`Gear: ${err.message}`);
    });

    // Rental requests
    const rentalQuery = query(collection(db, 'broadcast_rental_requests'), orderBy('createdAt', 'desc'));
    const unsubRental = onSnapshot(rentalQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: 'rental' as const,
        userId: doc.data().requesterId || doc.data().userId,
        userName: doc.data().requesterName || doc.data().userName || 'Unknown',
        category: doc.data().title || doc.data().equipmentName || doc.data().equipmentCategory || 'Rental Request',
        description: doc.data().description,
        location: doc.data().details?.location || doc.data().location || '',
        startDate: doc.data().startDate?.toDate() || doc.data().createdAt?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || doc.data().expiresAt?.toDate(),
        status: doc.data().status,
        timeoutAt: doc.data().expiresAt?.toDate() || doc.data().timeoutAt?.toDate(),
        assignedId: doc.data().acceptedByLenderId,
        assignedName: doc.data().acceptedByLenderName,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        pickupOtp: doc.data().pickupOtp,
        dropOtp: doc.data().dropOtp,
        pickupVerified: doc.data().pickupVerified || false,
        dropVerified: doc.data().dropVerified || false,
        pickupVerifiedAt: doc.data().pickupVerifiedAt?.toDate(),
        dropVerifiedAt: doc.data().dropVerifiedAt?.toDate(),
      }));
      setRentalRequests(data);
      console.log('Rental requests loaded:', data.length);
    }, (err) => {
      console.error('Error loading rental requests:', err);
      setError(`Rental: ${err.message}`);
    });

    // Workforce requests
    const workforceQuery = query(collection(db, 'broadcast_workforce_requests'), orderBy('createdAt', 'desc'));
    const unsubWorkforce = onSnapshot(workforceQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: 'workforce' as const,
        userId: doc.data().requesterId || doc.data().userId,
        userName: doc.data().requesterName || doc.data().userName || 'Unknown',
        category: doc.data().title || doc.data().roleRequired || doc.data().crewCategory || 'Workforce Request',
        description: doc.data().description,
        location: doc.data().details?.location || doc.data().location || '',
        startDate: doc.data().startDate?.toDate() || doc.data().createdAt?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || doc.data().expiresAt?.toDate(),
        status: doc.data().status,
        timeoutAt: doc.data().expiresAt?.toDate() || doc.data().timeoutAt?.toDate(),
        assignedId: doc.data().acceptedByLenderId || doc.data().assignedWorkerId,
        assignedName: doc.data().acceptedByLenderName || doc.data().assignedWorkerName,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        pickupOtp: doc.data().pickupOtp,
        dropOtp: doc.data().dropOtp,
        pickupVerified: doc.data().pickupVerified || false,
        dropVerified: doc.data().dropVerified || false,
        pickupVerifiedAt: doc.data().pickupVerifiedAt?.toDate(),
        dropVerifiedAt: doc.data().dropVerifiedAt?.toDate(),
      }));
      setWorkforceRequests(data);
      setLoading(false);
      console.log('Workforce requests loaded:', data.length);
    }, (err) => {
      console.error('Error loading workforce requests:', err);
      setError(`Workforce: ${err.message}`);
      setLoading(false);
    });

    return () => {
      unsubGear();
      unsubRental();
      unsubWorkforce();
    };
  }, []);

  const handleCancelRequest = async (request: BroadcastRequest) => {
    const collectionName = {
      gear: 'broadcast_gear_requests',
      rental: 'broadcast_rental_requests',
      workforce: 'broadcast_workforce_requests',
    }[request.type];

    try {
      await updateDoc(doc(db, collectionName, request.id), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const handleExpireRequest = async (request: BroadcastRequest) => {
    const collectionName = {
      gear: 'broadcast_gear_requests',
      rental: 'broadcast_rental_requests',
      workforce: 'broadcast_workforce_requests',
    }[request.type];

    try {
      await updateDoc(doc(db, collectionName, request.id), {
        status: 'expired',
        adminExpired: true,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error expiring request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      searching: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      active: 'bg-purple-100 text-purple-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-gray-100 text-gray-700',
      expired: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getOtpVerificationBadge = (request: BroadcastRequest) => {
    if (!request.pickupOtp && !request.dropOtp) return null;
    
    const pickupStatus = request.pickupVerified ? 'verified' : 'pending';
    const dropStatus = request.dropVerified ? 'verified' : 'pending';
    
    return (
      <div className="flex flex-col gap-1">
        <span className={`rounded px-1.5 py-0.5 text-xs ${request.pickupVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          Pickup: {pickupStatus}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-xs ${request.dropVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          Drop: {dropStatus}
        </span>
      </div>
    );
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { color: string; icon: typeof Camera }> = {
      gear: { color: 'bg-purple-100 text-purple-700', icon: Camera },
      rental: { color: 'bg-blue-100 text-blue-700', icon: Camera },
      workforce: { color: 'bg-orange-100 text-orange-700', icon: Users },
    };
    const { color, icon: Icon } = config[type] || config.gear;
    return (
      <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${color}`}>
        <Icon className="h-3 w-3" />
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  // Combine all requests
  const allRequests = [...gearRequests, ...rentalRequests, ...workforceRequests].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Filter by tab
  const tabFilteredRequests = activeTab === 'all' 
    ? allRequests 
    : allRequests.filter((r) => r.type === activeTab);

  // Filter by status and search
  const filteredRequests = tabFilteredRequests.filter((request) => {
    const matchesSearch = 
      request.userName?.toLowerCase().includes(search.toLowerCase()) ||
      request.category?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedData = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = allRequests.filter((r) => r.status === 'searching').length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Broadcast Requests</h1>
        <p className="text-gray-600">Monitor all quick-match broadcast requests</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          <p className="font-medium">Error loading requests:</p>
          <p className="text-sm">{error}</p>
          <p className="mt-2 text-xs">Check browser console for details. Make sure Firestore rules are deployed.</p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Requests</p>
          <p className="text-2xl font-bold text-blue-700">{allRequests.length}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Active (Searching)</p>
          <p className="text-2xl font-bold text-yellow-700">{activeCount}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Gear Requests</p>
          <p className="text-2xl font-bold text-purple-700">{gearRequests.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Rental Requests</p>
          <p className="text-2xl font-bold text-green-700">{rentalRequests.length}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Workforce Requests</p>
          <p className="text-2xl font-bold text-orange-700">{workforceRequests.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {(['all', 'gear', 'rental', 'workforce'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'all' ? (
              <>
                <Radio className="mr-2 inline h-4 w-4" />
                All ({allRequests.length})
              </>
            ) : tab === 'gear' ? (
              <>
                <Camera className="mr-2 inline h-4 w-4" />
                Gear ({gearRequests.length})
              </>
            ) : tab === 'rental' ? (
              <>
                <Camera className="mr-2 inline h-4 w-4" />
                Rental ({rentalRequests.length})
              </>
            ) : (
              <>
                <Users className="mr-2 inline h-4 w-4" />
                Workforce ({workforceRequests.length})
              </>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="searching">Searching</option>
          <option value="accepted">Accepted</option>
          <option value="active">Active (In Progress)</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Request
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                OTP Verification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Assigned To
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
                  No requests found
                </td>
              </tr>
            ) : (
              paginatedData.map((request) => (
                <tr
                  key={`${request.type}-${request.id}`}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedRequest(request)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{request.category}</p>
                      <p className="text-xs text-gray-500">by {request.userName}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {getTypeBadge(request.type)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {request.location || 'N/A'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {format(request.startDate, 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {getOtpVerificationBadge(request) || <span className="text-gray-400 text-xs">N/A</span>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {request.assignedName ? (
                      <span className="text-green-600">{request.assignedName}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === request.id ? null : request.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {showMenu === request.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                          {request.status === 'searching' && (
                            <>
                              <button
                                onClick={() => handleCancelRequest(request)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" /> Cancel Request
                              </button>
                              <button
                                onClick={() => handleExpireRequest(request)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50"
                              >
                                <AlertCircle className="h-4 w-4" /> Force Expire
                              </button>
                            </>
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
              {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length}
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

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getTypeBadge(selectedRequest.type)}
                {getStatusBadge(selectedRequest.status)}
              </div>

              <h3 className="text-lg font-semibold">{selectedRequest.category}</h3>
              
              {selectedRequest.description && (
                <p className="text-gray-600">{selectedRequest.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Requested By</p>
                  <p className="font-bold">{selectedRequest.userName}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-bold">{selectedRequest.location || 'N/A'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-bold">{format(selectedRequest.startDate, 'MMM d, yyyy')}</p>
                </div>
                {selectedRequest.endDate && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-bold">{format(selectedRequest.endDate, 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {selectedRequest.assignedName && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm text-green-600">Assigned To</p>
                  <p className="font-bold text-green-700">{selectedRequest.assignedName}</p>
                </div>
              )}

              {selectedRequest.timeoutAt && selectedRequest.status === 'searching' && (
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="text-sm text-orange-600">Timeout At</p>
                  <p className="font-bold text-orange-700">
                    {format(selectedRequest.timeoutAt, 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-700">{format(selectedRequest.createdAt, 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {selectedRequest.status === 'searching' && (
                <>
                  <button
                    onClick={() => {
                      handleCancelRequest(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
                  >
                    Cancel Request
                  </button>
                  <button
                    onClick={() => {
                      handleExpireRequest(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    className="rounded-lg bg-orange-100 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-200"
                  >
                    Force Expire
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedRequest(null)}
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
