'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  MoreVertical,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  Phone,
  X,
  Users,
} from 'lucide-react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUsers, updateUserRole, toggleUserBan, deleteUser } from '@/lib/firestore';
import type { User, ContactInfo } from '@/lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const pageSize = 15;

  useEffect(() => {
    const unsubscribe = getUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleToggleBan = async (user: User) => {
    try {
      await toggleUserBan(user.uid, !user.isBanned);
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling ban:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      setDeleteConfirm(null);
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">N/A</span>;
    const colors: Record<string, string> = {
      renter: 'bg-green-100 text-green-700',
      lender: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[role] || 'bg-gray-100'}`}>
        {role.toUpperCase()}
      </span>
    );
  };

  const getVerificationBadge = (status: string) => {
    const config: Record<string, { color: string; icon: typeof CheckCircle }> = {
      verified: { color: 'text-green-600', icon: CheckCircle },
      pending: { color: 'text-orange-500', icon: Shield },
      rejected: { color: 'text-red-500', icon: XCircle },
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return <Icon className={`h-5 w-5 ${color}`} />;
  };

  const columns = [
    {
      key: 'displayName',
      header: 'User',
      render: (user: User) => {
        const displayName = user.displayName || user.filmgridId || 'Unknown User';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                displayName[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user.filmgridId}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phoneNumber',
      header: 'Phone',
      render: (user: User) => <span className="text-gray-600">{user.phoneNumber || 'No phone'}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => getRoleBadge(user.role),
    },
    {
      key: 'verificationStatus',
      header: 'Verified',
      render: (user: User) => getVerificationBadge(user.verificationStatus),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (user: User) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>{(user.rating ?? 0).toFixed(1)}</span>
          <span className="text-gray-400">({user.totalRatings ?? 0})</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user: User) => (
        <span className="text-gray-600">
          {user.createdAt ? format(user.createdAt, 'MMM d, yyyy') : 'N/A'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            user.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {user.isBanned ? 'Banned' : 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(showMenu === user.uid ? null : user.uid);
            }}
            className="rounded p-1 hover:bg-gray-100"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {showMenu === user.uid && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
              <p className="border-b px-4 py-2 text-xs font-medium text-gray-500">Change Role</p>
              <button
                onClick={() => handleRoleChange(user.uid, 'renter')}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  user.role === 'renter' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                Renter
              </button>
              <button
                onClick={() => handleRoleChange(user.uid, 'lender')}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  user.role === 'lender' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                Lender
              </button>
              <div className="border-t">
                <button
                  onClick={() => handleToggleBan(user)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                    user.isBanned ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Ban className="h-4 w-4" />
                  {user.isBanned ? 'Unban User' : 'Ban User'}
                </button>
                {deleteConfirm === user.uid ? (
                  <div className="border-t bg-red-50 p-2">
                    <p className="mb-2 text-xs text-red-600">Delete this user permanently?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteUser(user.uid)}
                        className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(user.uid)}
                    className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Delete User
                  </button>
                )}
              </div>
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

  // Get unregistered contacts (contacts not in our users list)
  const getUnregisteredContacts = (userContacts: ContactInfo[] | undefined): ContactInfo[] => {
    if (!userContacts || userContacts.length === 0) return [];
    
    // Get all registered phone numbers
    const registeredPhones = new Set(
      users.map(u => normalizePhone(u.phoneNumber))
    );
    
    // Filter and deduplicate
    const seen = new Set<string>();
    return userContacts.filter(contact => {
      const normalized = normalizePhone(contact.phoneNumber);
      if (seen.has(normalized)) return false; // Skip duplicates
      if (registeredPhones.has(normalized)) return false; // Skip registered
      seen.add(normalized);
      return true;
    });
  };

  const normalizePhone = (phone: string): string => {
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    normalized = normalized.replace(/^0+/, '');
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('91') && normalized.length > 10) {
        normalized = '+' + normalized;
      } else if (normalized.length === 10) {
        normalized = '+91' + normalized;
      }
    }
    return normalized;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage all users on the platform</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* Verification Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => { setVerificationFilter('all'); setCurrentPage(1); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              verificationFilter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => { setVerificationFilter('pending'); setCurrentPage(1); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              verificationFilter === 'pending'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending Verification ({users.filter(u => u.verificationStatus === 'pending' && u.idProofUrl).length})
          </button>
          <button
            onClick={() => { setVerificationFilter('verified'); setCurrentPage(1); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              verificationFilter === 'verified'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Verified
          </button>
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
              let filteredData = users.filter((user) =>
                user.displayName?.toLowerCase().includes(search.toLowerCase())
              );
              
              // Apply verification filter
              if (verificationFilter === 'pending') {
                filteredData = filteredData.filter(u => u.verificationStatus === 'pending' && u.idProofUrl);
              } else if (verificationFilter === 'verified') {
                filteredData = filteredData.filter(u => u.verificationStatus === 'verified');
              }
              
              const totalPages = Math.ceil(filteredData.length / pageSize);
              const startIndex = (currentPage - 1) * pageSize;
              const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

              if (paginatedData.length === 0) {
                return (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                );
              }

              return paginatedData.map((user) => (
                <tr
                  key={user.uid}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowDetailsModal(user)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-6 py-4 text-sm">
                      {column.render ? column.render(user) : (user as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ));
            })()}
          </tbody>
        </table>

        {/* Pagination */}
        {(() => {
          let filteredData = users.filter((user) =>
            user.displayName?.toLowerCase().includes(search.toLowerCase())
          );
          
          // Apply verification filter
          if (verificationFilter === 'pending') {
            filteredData = filteredData.filter(u => u.verificationStatus === 'pending' && u.idProofUrl);
          } else if (verificationFilter === 'verified') {
            filteredData = filteredData.filter(u => u.verificationStatus === 'verified');
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

      {/* User Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                {showDetailsModal.avatarUrl ? (
                  <img src={showDetailsModal.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  showDetailsModal.displayName?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{showDetailsModal.displayName}</h3>
                <p className="text-sm text-gray-500">{showDetailsModal.filmgridId}</p>
                <p className="text-sm text-gray-500">{showDetailsModal.phoneNumber}</p>
              </div>
            </div>

            {/* Verification Status */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 font-medium text-gray-700">Verification Status</h4>
              <div className="flex items-center gap-2">
                {getVerificationBadge(showDetailsModal.verificationStatus)}
                <span className="capitalize">{showDetailsModal.verificationStatus || 'pending'}</span>
                {showDetailsModal.requestedRole && (
                  <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Requesting: {showDetailsModal.requestedRole}
                  </span>
                )}
              </div>
              {showDetailsModal.idProofUrl && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">ID Proof: {showDetailsModal.idProofType || 'Document'}</p>
                  <a
                    href={showDetailsModal.idProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Eye className="h-4 w-4" /> View Document
                  </a>
                  {/* ID Proof Image Preview */}
                  <div className="mt-3">
                    <img 
                      src={showDetailsModal.idProofUrl} 
                      alt="ID Proof" 
                      className="max-h-48 rounded-lg border object-contain"
                    />
                  </div>
                </div>
              )}
              {showDetailsModal.verificationNotes && (
                <p className="mt-2 text-sm text-gray-600">
                  Notes: {showDetailsModal.verificationNotes}
                </p>
              )}
              
              {/* Verification Actions */}
              {showDetailsModal.idProofUrl && showDetailsModal.verificationStatus === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await updateUserRole(showDetailsModal.uid, showDetailsModal.requestedRole || showDetailsModal.role || 'renter');
                        // Update verification status
                        const { doc, updateDoc } = await import('firebase/firestore');
                        const { db } = await import('@/lib/firebase');
                        await updateDoc(doc(db, 'users', showDetailsModal.uid), {
                          verificationStatus: 'verified',
                          verifiedAt: new Date(),
                        });
                        setShowDetailsModal(null);
                      } catch (error) {
                        console.error('Error approving user:', error);
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={async () => {
                      const reason = prompt('Enter rejection reason (optional):');
                      try {
                        const { doc, updateDoc } = await import('firebase/firestore');
                        const { db } = await import('@/lib/firebase');
                        await updateDoc(doc(db, 'users', showDetailsModal.uid), {
                          verificationStatus: 'rejected',
                          verificationNotes: reason || 'Verification rejected',
                        });
                        setShowDetailsModal(null);
                      } catch (error) {
                        console.error('Error rejecting user:', error);
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>

            {/* Unregistered Contacts */}
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <h4 className="font-medium text-gray-700">Unregistered Contacts</h4>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Phone numbers from this user&apos;s contacts that are not registered on FilmGrid (no duplicates)
              </p>
              
              {(() => {
                const unregisteredContacts = getUnregisteredContacts(showDetailsModal.contacts);
                if (unregisteredContacts.length === 0) {
                  return (
                    <p className="text-sm text-gray-400 italic">
                      {showDetailsModal.contacts?.length 
                        ? 'All contacts are already registered or no unique unregistered contacts found'
                        : 'No contacts data available for this user'}
                    </p>
                  );
                }
                return (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unregisteredContacts.map((contact, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{contact.name}</td>
                            <td className="px-3 py-2">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {contact.phoneNumber}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-gray-500">
                      Total: {unregisteredContacts.length} unregistered contacts
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(null)}
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
