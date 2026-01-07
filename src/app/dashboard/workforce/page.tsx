'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Users,
  Briefcase,
  MapPin,
  Clock,
  Star,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  IndianRupee,
  Phone,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WorkerProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  category: string;
  skills: string[];
  experience: number;
  hourlyRate?: number;
  dailyRate?: number;
  location: string;
  bio: string;
  rating: number;
  totalRatings: number;
  completedJobs: number;
  isVerified: boolean;
  isAvailable: boolean;
  profileImageUrl?: string;
  createdAt: Date;
}

interface WorkforceRequest {
  id: string;
  userId: string;
  userName: string;
  crewCategory: string;
  roleRequired: string;
  startDate: Date;
  endDate?: Date;
  durationHours: number;
  location: string;
  status: 'searching' | 'accepted' | 'completed' | 'cancelled' | 'expired';
  paymentAmount?: number;
  paymentType?: string;
  description?: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  createdAt: Date;
}

export default function WorkforcePage() {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [requests, setRequests] = useState<WorkforceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workers' | 'requests'>('workers');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkerProfile | WorkforceRequest | null>(null);
  const pageSize = 15;

  useEffect(() => {
    // Worker profiles
    const workersQuery = query(collection(db, 'worker_profiles'), orderBy('createdAt', 'desc'));
    const unsubWorkers = onSnapshot(workersQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as WorkerProfile[];
      setWorkers(data);
    });

    // Workforce requests
    const requestsQuery = query(collection(db, 'broadcast_workforce_requests'), orderBy('createdAt', 'desc'));
    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate(),
      })) as WorkforceRequest[];
      setRequests(data);
      setLoading(false);
    });

    return () => {
      unsubWorkers();
      unsubRequests();
    };
  }, []);

  const handleToggleVerified = async (worker: WorkerProfile) => {
    try {
      await updateDoc(doc(db, 'worker_profiles', worker.id), {
        isVerified: !worker.isVerified,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling verification:', error);
    }
  };

  const handleToggleAvailable = async (worker: WorkerProfile) => {
    try {
      await updateDoc(doc(db, 'worker_profiles', worker.id), {
        isAvailable: !worker.isAvailable,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker profile?')) return;
    try {
      await deleteDoc(doc(db, 'worker_profiles', workerId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting worker:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'broadcast_workforce_requests', requestId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      searching: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
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

  const categories = ['all', ...new Set([
    ...workers.map((w) => w.category),
    ...requests.map((r) => r.crewCategory),
  ].filter(Boolean))];

  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch = worker.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || worker.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.roleRequired?.toLowerCase().includes(search.toLowerCase()) ||
      request.userName?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || request.crewCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const currentData = activeTab === 'workers' ? filteredWorkers : filteredRequests;
  const totalPages = Math.ceil(currentData.length / pageSize);
  const paginatedData = currentData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        <h1 className="text-2xl font-bold text-gray-900">Workforce Management</h1>
        <p className="text-gray-600">Manage crew members and workforce requests</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Total Workers</p>
          <p className="text-2xl font-bold text-orange-700">{workers.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Available</p>
          <p className="text-2xl font-bold text-green-700">
            {workers.filter((w) => w.isAvailable).length}
          </p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Active Requests</p>
          <p className="text-2xl font-bold text-yellow-700">
            {requests.filter((r) => r.status === 'searching').length}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Completed Jobs</p>
          <p className="text-2xl font-bold text-blue-700">
            {requests.filter((r) => r.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setActiveTab('workers');
            setCurrentPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'workers'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="mr-2 inline h-4 w-4" />
          Worker Profiles ({workers.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('requests');
            setCurrentPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'requests'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Briefcase className="mr-2 inline h-4 w-4" />
          Workforce Requests ({requests.length})
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'workers' ? 'Search workers...' : 'Search requests...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {activeTab === 'workers' ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No workers found
                  </td>
                </tr>
              ) : (
                (paginatedData as WorkerProfile[]).map((worker) => (
                  <tr
                    key={worker.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedItem(worker)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                          {worker.profileImageUrl ? (
                            <img
                              src={worker.profileImageUrl}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-orange-600">
                              {worker.name?.[0]?.toUpperCase() || 'W'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{worker.name}</p>
                          <p className="text-xs text-gray-500">{worker.completedJobs || 0} jobs</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                        {worker.category || 'General'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {worker.location || 'N/A'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-gray-600">
                        {worker.dailyRate ? (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {worker.dailyRate}/day
                          </span>
                        ) : worker.hourlyRate ? (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {worker.hourlyRate}/hr
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{(worker.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {worker.isVerified && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            ✓ Verified
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            worker.isAvailable
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {worker.isAvailable ? 'Available' : 'Busy'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === worker.id ? null : worker.id)}
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        {showMenu === worker.id && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                            <button
                              onClick={() => handleToggleVerified(worker)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {worker.isVerified ? (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" /> Remove Verification
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" /> Verify Worker
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleAvailable(worker)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {worker.isAvailable ? 'Mark Busy' : 'Mark Available'}
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker.id)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete Profile
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                (paginatedData as WorkforceRequest[]).map((request) => (
                  <tr
                    key={request.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedItem(request)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{request.roleRequired}</p>
                        <p className="text-xs text-gray-500">by {request.userName}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                        {request.crewCategory || 'General'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {request.location || 'N/A'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        {request.durationHours}h
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {request.paymentAmount ? (
                        <div className="flex items-center gap-1 font-medium text-green-600">
                          <IndianRupee className="h-4 w-4" />
                          {request.paymentAmount.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(request.status)}
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
                              <button
                                onClick={() => handleCancelRequest(request.id)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" /> Cancel Request
                              </button>
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, currentData.length)} of {currentData.length}
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
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'workers' ? 'Worker Details' : 'Request Details'}
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {'skills' in selectedItem ? (
              // Worker details
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                    {selectedItem.profileImageUrl ? (
                      <img
                        src={selectedItem.profileImageUrl}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-orange-600">
                        {selectedItem.name?.[0]?.toUpperCase() || 'W'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedItem.name}</h3>
                    <p className="text-sm text-gray-500">{selectedItem.category}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedItem.isVerified && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                          ✓ Verified
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selectedItem.isAvailable
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {selectedItem.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Bio</h4>
                  <p className="text-gray-700">{selectedItem.bio || 'No bio provided'}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-bold">{selectedItem.experience || 0} years</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Completed Jobs</p>
                    <p className="font-bold">{selectedItem.completedJobs || 0}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Rating</p>
                    <p className="flex items-center gap-1 font-bold">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {(selectedItem.rating || 0).toFixed(1)}
                    </p>
                  </div>
                </div>

                {selectedItem.skills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Skills</h4>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedItem.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {selectedItem.phone || 'No phone'}
                </div>
              </div>
            ) : (
              // Request details
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{selectedItem.roleRequired}</h3>
                <p className="text-gray-600">{selectedItem.description || 'No description'}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-bold">{selectedItem.crewCategory}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-bold">{selectedItem.durationHours} hours</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-bold">{selectedItem.location}</p>
                  </div>
                  {selectedItem.paymentAmount && (
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-sm text-green-600">Payment</p>
                      <p className="font-bold text-green-700">
                        ₹{selectedItem.paymentAmount.toLocaleString()}
                        {selectedItem.paymentType && ` (${selectedItem.paymentType})`}
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.assignedWorkerName && (
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-sm text-blue-600">Assigned Worker</p>
                    <p className="font-bold text-blue-700">{selectedItem.assignedWorkerName}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="text-gray-700">{format(selectedItem.startDate, 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {activeTab === 'workers' && 'skills' in selectedItem && (
                <button
                  onClick={() => handleToggleVerified(selectedItem as WorkerProfile)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    selectedItem.isVerified
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {selectedItem.isVerified ? 'Remove Verification' : 'Verify Worker'}
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
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
