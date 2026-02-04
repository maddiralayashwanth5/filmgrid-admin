'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
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
  Download,
  Clock,
} from 'lucide-react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUsers, updateUserRole, toggleUserBan, deleteUser, resetUserVerification, resetAllUsersVerification, toggleRoleVerification, setAllRolesVerification, findDuplicateUsers, cleanupDuplicateUsers, cleanupAllDuplicateUsers, getRoleVerifications, approveRoleVerification, rejectRoleVerification, type DuplicateUserGroup, type RoleVerificationRequest, type RoleVerificationType } from '@/lib/firestore';
import type { User, ContactInfo } from '@/lib/types';
import { Copy, Trash2, AlertTriangle } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'banned'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'lender' | 'crew' | 'influencer' | 'store'>('all');
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showRoleVerificationModal, setShowRoleVerificationModal] = useState<User | null>(null);
  const [roleVerifications, setRoleVerifications] = useState<Record<string, boolean>>({});
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateUserGroup[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [cleaningUp, setCleaningUp] = useState<string | null>(null);
  const [cleaningUpAll, setCleaningUpAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'filmmaker' | 'lender' | 'worker' | 'influencer' | 'store'>('users');
  const [roleRequests, setRoleRequests] = useState<RoleVerificationRequest[]>([]);
  const [loadingRoleRequests, setLoadingRoleRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [roleVerifyModal, setRoleVerifyModal] = useState<{ user: User; role: string } | null>(null);
  const pageSize = 15;

  useEffect(() => {
    const unsubscribe = getUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch role verification requests when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      setRoleRequests([]);
      return;
    }
    
    setLoadingRoleRequests(true);
    const unsubscribe = getRoleVerifications(activeTab as RoleVerificationType, 'pending', (requests) => {
      setRoleRequests(requests);
      setLoadingRoleRequests(false);
    });
    return () => unsubscribe();
  }, [activeTab]);

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

  const handleResetVerification = async (userId: string) => {
    try {
      await resetUserVerification(userId);
      setShowMenu(null);
    } catch (error) {
      console.error('Error resetting verification:', error);
    }
  };

  const openRoleVerificationModal = (user: User) => {
    // Parse role verifications from user data
    setRoleVerifications({
      filmmaker: user.lenderVerification?.status === 'verified', // filmmaker uses lender verification
      lender: user.lenderVerification?.status === 'verified',
      worker: user.workerVerification?.status === 'verified',
      influencer: user.influencerVerification?.status === 'verified',
      store: user.storeVerification?.status === 'verified',
    });
    setShowRoleVerificationModal(user);
    setShowMenu(null);
  };

  const handleToggleRoleVerification = async (role: 'filmmaker' | 'lender' | 'worker' | 'influencer' | 'store', verified: boolean) => {
    if (!showRoleVerificationModal) return;
    try {
      // For store, we need to handle it differently
      if (role === 'store') {
        const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        await updateDoc(doc(db, 'users', showRoleVerificationModal.uid), {
          'storeVerification.status': verified ? 'verified' : 'pending',
          'storeVerification.verifiedAt': verified ? Timestamp.now() : null,
          updatedAt: Timestamp.now(),
        });
      } else {
        await toggleRoleVerification(showRoleVerificationModal.uid, role, verified);
      }
      setRoleVerifications(prev => ({ ...prev, [role]: verified }));
    } catch (error) {
      console.error('Error toggling role verification:', error);
    }
  };

  const handleSetAllRoles = async (verified: boolean) => {
    if (!showRoleVerificationModal) return;
    try {
      await setAllRolesVerification(showRoleVerificationModal.uid, verified);
      // Also update store verification
      const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await updateDoc(doc(db, 'users', showRoleVerificationModal.uid), {
        'storeVerification.status': verified ? 'verified' : 'pending',
        'storeVerification.verifiedAt': verified ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      });
      setRoleVerifications({
        filmmaker: verified,
        lender: verified,
        worker: verified,
        influencer: verified,
        store: verified,
      });
      setShowRoleVerificationModal(null);
    } catch (error) {
      console.error('Error setting all roles:', error);
    }
  };

  const handleResetAllVerifications = async () => {
    setResetting(true);
    try {
      const count = await resetAllUsersVerification();
      alert(`Successfully reset verification for ${count} users`);
      setShowResetAllModal(false);
    } catch (error) {
      console.error('Error resetting all verifications:', error);
      alert('Failed to reset verifications');
    }
    setResetting(false);
  };

  const handleOpenDuplicatesModal = async () => {
    setShowDuplicatesModal(true);
    setLoadingDuplicates(true);
    try {
      const groups = await findDuplicateUsers();
      setDuplicateGroups(groups);
    } catch (error) {
      console.error('Error finding duplicates:', error);
      alert('Failed to find duplicate users');
    }
    setLoadingDuplicates(false);
  };

  const handleCleanupDuplicate = async (phone: string) => {
    setCleaningUp(phone);
    try {
      const deleted = await cleanupDuplicateUsers(phone);
      alert(`Deleted ${deleted} duplicate user(s) for ${phone}`);
      // Refresh the list
      const groups = await findDuplicateUsers();
      setDuplicateGroups(groups);
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      alert('Failed to clean up duplicates');
    }
    setCleaningUp(null);
  };

  const handleCleanupAllDuplicates = async () => {
    if (!confirm('Are you sure you want to clean up ALL duplicate users? This will keep the best profile for each phone number and delete the rest.')) {
      return;
    }
    setCleaningUpAll(true);
    try {
      const result = await cleanupAllDuplicateUsers();
      alert(`Cleaned up ${result.groupsCleaned} duplicate groups, deleted ${result.usersDeleted} users`);
      setDuplicateGroups([]);
      setShowDuplicatesModal(false);
    } catch (error) {
      console.error('Error cleaning up all duplicates:', error);
      alert('Failed to clean up duplicates');
    }
    setCleaningUpAll(false);
  };

  const handleApproveRoleRequest = async (request: RoleVerificationRequest) => {
    setProcessingRequest(request.id);
    try {
      await approveRoleVerification(request, 'admin');
    } catch (error) {
      console.error('Error approving role verification:', error);
      alert('Failed to approve verification');
    }
    setProcessingRequest(null);
  };

  const handleRejectRoleRequest = async (request: RoleVerificationRequest) => {
    const reason = prompt('Enter rejection reason (optional):');
    setProcessingRequest(request.id);
    try {
      await rejectRoleVerification(request, 'admin', reason || 'Verification rejected');
    } catch (error) {
      console.error('Error rejecting role verification:', error);
      alert('Failed to reject verification');
    }
    setProcessingRequest(null);
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

  // Helper to check if user has applied for a role (verification exists)
  const hasRoleApplication = (user: User, role: string) => {
    switch (role) {
      case 'user':
        return true; // All users have base user status
      case 'lender':
        return user.lenderVerification !== undefined;
      case 'crew':
        return user.workerVerification !== undefined;
      case 'influencer':
        return user.influencerVerification !== undefined;
      case 'store':
        return user.storeVerification !== undefined;
      default:
        return false;
    }
  };

  // Helper to check if role is verified
  const isRoleVerified = (user: User, role: string) => {
    switch (role) {
      case 'user':
        return user.verificationStatus === 'verified';
      case 'lender':
        return user.lenderVerification?.status === 'verified';
      case 'crew':
        return user.workerVerification?.status === 'verified';
      case 'influencer':
        return user.influencerVerification?.status === 'verified';
      case 'store':
        return user.storeVerification?.status === 'verified';
      default:
        return false;
    }
  };

  // Helper to check if role verification is pending
  const isRolePending = (user: User, role: string) => {
    switch (role) {
      case 'user':
        return user.verificationStatus === 'pending';
      case 'lender':
        return user.lenderVerification?.status === 'pending';
      case 'crew':
        return user.workerVerification?.status === 'pending';
      case 'influencer':
        return user.influencerVerification?.status === 'pending';
      case 'store':
        return user.storeVerification?.status === 'pending';
      default:
        return false;
    }
  };

  // Handle role verification update from modal
  const handleRoleVerificationUpdate = async (user: User, role: string, newStatus: 'verified' | 'pending' | 'rejected') => {
    try {
      const roleFieldMap: Record<string, string> = {
        'user': 'verificationStatus',
        'lender': 'lenderVerification',
        'crew': 'workerVerification',
        'influencer': 'influencerVerification',
        'store': 'storeVerification',
      };
      
      const fieldName = roleFieldMap[role];
      if (!fieldName) return;
      
      const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      if (role === 'user') {
        await updateDoc(doc(db, 'users', user.uid), {
          verificationStatus: newStatus,
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          [`${fieldName}.status`]: newStatus,
          [`${fieldName}.verifiedAt`]: newStatus === 'verified' ? Timestamp.now() : null,
          updatedAt: Timestamp.now(),
        });
      }
      setRoleVerifyModal(null);
    } catch (error) {
      console.error('Error updating role verification:', error);
    }
  };

  // Helper to get role verification icon - only show if user has applied for that role
  const getRoleVerificationIcon = (user: User, role: string) => {
    const hasApplied = hasRoleApplication(user, role);
    const verified = isRoleVerified(user, role);
    const pending = isRolePending(user, role);
    
    if (!hasApplied) {
      // No application - show empty circle (not clickable)
      return (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200" title="Not applied" />
      );
    }
    
    // Clickable button to open modal
    const handleClick = () => setRoleVerifyModal({ user, role });
    
    if (verified) {
      return (
        <button onClick={handleClick} className="hover:opacity-70 transition-opacity cursor-pointer" title="Click to manage">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </button>
      );
    }
    
    if (pending) {
      return (
        <button onClick={handleClick} className="hover:opacity-70 transition-opacity cursor-pointer" title="Click to manage">
          <Clock className="h-5 w-5 text-orange-500" />
        </button>
      );
    }
    
    // Rejected or not verified
    return (
      <button onClick={handleClick} className="hover:opacity-70 transition-opacity cursor-pointer" title="Click to manage">
        <XCircle className="h-5 w-5 text-red-400" />
      </button>
    );
  };

  const columns = [
    {
      key: 'displayName',
      header: 'User',
      render: (user: User) => {
        const displayName = user.displayName || user.filmgridId || 'Unknown User';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                displayName[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user.filmgridId || 'FG-ID'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phoneNumber',
      header: 'Phone',
      render: (user: User) => <span className="text-gray-600">{user.phoneNumber || '-'}</span>,
    },
    {
      key: 'rolesVerified',
      header: (
        <div className="text-center min-w-[280px]">
          <span className="uppercase text-xs font-semibold tracking-wider text-gray-500">Roles Verified</span>
          <div className="flex justify-center mt-1.5">
            <div className="flex gap-4 text-[10px] font-normal normal-case text-gray-400">
              <span className="w-10 text-center">User</span>
              <span className="w-10 text-center">Lender</span>
              <span className="w-10 text-center">Crew</span>
              <span className="w-12 text-center">Influencer</span>
              <span className="w-10 text-center">Store</span>
            </div>
          </div>
        </div>
      ),
      render: (user: User) => (
        <div className="flex items-center justify-center min-w-[280px]">
          <div className="flex gap-4">
            <div className="w-10 flex justify-center">{getRoleVerificationIcon(user, 'user')}</div>
            <div className="w-10 flex justify-center">{getRoleVerificationIcon(user, 'lender')}</div>
            <div className="w-10 flex justify-center">{getRoleVerificationIcon(user, 'crew')}</div>
            <div className="w-12 flex justify-center">{getRoleVerificationIcon(user, 'influencer')}</div>
            <div className="w-10 flex justify-center">{getRoleVerificationIcon(user, 'store')}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (user: User) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>{(user.rating ?? 0).toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user: User) => (
        <div className="text-gray-600">
          <div>{user.createdAt ? format(user.createdAt, 'MMM d, yyyy') : 'N/A'}</div>
          <div className="text-xs text-gray-400">{user.createdAt ? format(user.createdAt, 'h:mm a') : ''}</div>
        </div>
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
              <button
                onClick={() => openRoleVerificationModal(user)}
                className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
              >
                <Shield className="h-4 w-4" />
                Manage Verification
              </button>
              <button
                onClick={() => handleResetVerification(user.uid)}
                className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50"
              >
                <XCircle className="h-4 w-4" />
                Reset All Verification
              </button>
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

  const exportUsersToExcel = () => {
    const exportData = users.map(user => ({
      'Name': user.displayName || '',
      'Email': user.email || '',
      'Phone': user.phoneNumber || '',
      'FG ID': user.filmgridId || '',
      'Role': user.role || '',
      'Rating': user.rating || 0,
      'Total Ratings': user.totalRatings || 0,
      'Verification Status': user.verificationStatus || '',
      'Is Banned': user.isBanned ? 'Yes' : 'No',
      'Created At': user.createdAt ? format(user.createdAt, 'yyyy-MM-dd HH:mm') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, `users_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Verification</h1>
          <p className="text-gray-600">Manage users and role verification requests</p>
        </div>
        {activeTab === 'users' && (
          <div className="flex gap-3">
            <button
              onClick={exportUsersToExcel}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={handleOpenDuplicatesModal}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              <Copy className="h-4 w-4" />
              Find Duplicates
            </button>
            <button
              onClick={() => setShowResetAllModal(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reset All Verifications
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('users'); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => { setActiveTab('filmmaker'); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'filmmaker'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Filmmaker Requests
          </button>
          <button
            onClick={() => { setActiveTab('lender'); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'lender'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lender Requests
          </button>
          <button
            onClick={() => { setActiveTab('worker'); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'worker'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Crew Requests
          </button>
          <button
            onClick={() => { setActiveTab('influencer'); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'influencer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Influencer Requests
          </button>
          <button
            onClick={() => { setActiveTab('store'); setCurrentPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'store'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Store Requests
          </button>
        </div>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Filters */}
          <div className="mb-4 space-y-3">
            {/* Search Row */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or FG ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Chips Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Verification Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Status:</span>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'All', color: 'blue' },
                    { key: 'pending', label: 'Pending', color: 'orange' },
                    { key: 'verified', label: 'Verified', color: 'green' },
                    { key: 'rejected', label: 'Rejected', color: 'red' },
                    { key: 'banned', label: 'Banned', color: 'gray' },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => { setVerificationFilter(key as typeof verificationFilter); setCurrentPage(1); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        verificationFilter === key
                          ? `bg-${color}-100 text-${color}-700 ring-1 ring-${color}-300`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-6 w-px bg-gray-200" />

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Role:</span>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'All Roles', color: 'blue' },
                    { key: 'lender', label: 'Lender', color: 'cyan' },
                    { key: 'crew', label: 'Crew', color: 'amber' },
                    { key: 'influencer', label: 'Influencer', color: 'pink' },
                    { key: 'store', label: 'Store', color: 'purple' },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => { setRoleFilter(key as typeof roleFilter); setCurrentPage(1); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        roleFilter === key
                          ? `bg-${color}-100 text-${color}-700 ring-1 ring-${color}-300`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(verificationFilter !== 'all' || roleFilter !== 'all' || search) && (
                <>
                  <div className="h-6 w-px bg-gray-200" />
                  <button
                    onClick={() => {
                      setVerificationFilter('all');
                      setRoleFilter('all');
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear all filters
                  </button>
                </>
              )}
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
              // Search filter - search by name, phone, or FG ID
              let filteredData = users.filter((user) => {
                const searchLower = search.toLowerCase();
                return (
                  user.displayName?.toLowerCase().includes(searchLower) ||
                  user.phoneNumber?.toLowerCase().includes(searchLower) ||
                  user.filmgridId?.toLowerCase().includes(searchLower)
                );
              });
              
              // Apply verification status filter
              if (verificationFilter === 'pending') {
                filteredData = filteredData.filter(u => u.verificationStatus === 'pending');
              } else if (verificationFilter === 'verified') {
                filteredData = filteredData.filter(u => u.verificationStatus === 'verified');
              } else if (verificationFilter === 'rejected') {
                filteredData = filteredData.filter(u => u.verificationStatus === 'rejected');
              } else if (verificationFilter === 'banned') {
                filteredData = filteredData.filter(u => u.isBanned === true);
              }

              // Apply role filter
              if (roleFilter === 'lender') {
                filteredData = filteredData.filter(u => u.lenderVerification?.status === 'verified' || u.lenderVerification?.status === 'pending');
              } else if (roleFilter === 'crew') {
                filteredData = filteredData.filter(u => u.workerVerification?.status === 'verified' || u.workerVerification?.status === 'pending');
              } else if (roleFilter === 'influencer') {
                filteredData = filteredData.filter(u => u.influencerVerification?.status === 'verified' || u.influencerVerification?.status === 'pending');
              } else if (roleFilter === 'store') {
                filteredData = filteredData.filter(u => u.storeVerification?.status === 'verified' || u.storeVerification?.status === 'pending');
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
          // Search filter - search by name, phone, or FG ID
          let filteredData = users.filter((user) => {
            const searchLower = search.toLowerCase();
            return (
              user.displayName?.toLowerCase().includes(searchLower) ||
              user.phoneNumber?.toLowerCase().includes(searchLower) ||
              user.filmgridId?.toLowerCase().includes(searchLower)
            );
          });
          
          // Apply verification status filter
          if (verificationFilter === 'pending') {
            filteredData = filteredData.filter(u => u.verificationStatus === 'pending');
          } else if (verificationFilter === 'verified') {
            filteredData = filteredData.filter(u => u.verificationStatus === 'verified');
          } else if (verificationFilter === 'rejected') {
            filteredData = filteredData.filter(u => u.verificationStatus === 'rejected');
          } else if (verificationFilter === 'banned') {
            filteredData = filteredData.filter(u => u.isBanned === true);
          }

          // Apply role filter
          if (roleFilter === 'lender') {
            filteredData = filteredData.filter(u => u.lenderVerification?.status === 'verified' || u.lenderVerification?.status === 'pending');
          } else if (roleFilter === 'crew') {
            filteredData = filteredData.filter(u => u.workerVerification?.status === 'verified' || u.workerVerification?.status === 'pending');
          } else if (roleFilter === 'influencer') {
            filteredData = filteredData.filter(u => u.influencerVerification?.status === 'verified' || u.influencerVerification?.status === 'pending');
          } else if (roleFilter === 'store') {
            filteredData = filteredData.filter(u => u.storeVerification?.status === 'verified' || u.storeVerification?.status === 'pending');
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
        </>
      )}

      {/* Role Verification Tab Content */}
      {activeTab !== 'users' && (
        <div className="rounded-lg border bg-white shadow-sm">
          {loadingRoleRequests ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : roleRequests.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-900">No Pending Requests</p>
              <p className="text-gray-500">There are no pending {activeTab} verification requests.</p>
            </div>
          ) : (
            <div className="divide-y">
              {roleRequests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                        {request.displayName?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{request.displayName || 'Unknown User'}</p>
                        <p className="text-sm text-gray-500">{request.phone}</p>
                        <p className="text-xs text-gray-400">
                          Submitted: {request.submittedAt ? format(request.submittedAt, 'MMM d, yyyy h:mm a') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.documentUrl && (
                        <a
                          href={request.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" /> View Doc
                        </a>
                      )}
                      <button
                        onClick={() => handleApproveRoleRequest(request)}
                        disabled={processingRequest === request.id}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectRoleRequest(request)}
                        disabled={processingRequest === request.id}
                        className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                  
                  {/* Additional info for specific roles */}
                  {request.role === 'store' && request.storeName && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700">Store Details</p>
                      <p className="text-sm text-gray-600">Name: {request.storeName}</p>
                      {request.storeAddress && <p className="text-sm text-gray-600">Address: {request.storeAddress}</p>}
                      {request.storeContact && <p className="text-sm text-gray-600">Contact: {request.storeContact}</p>}
                    </div>
                  )}
                  
                  {request.role === 'worker' && (request.unionId || request.bio) && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700">Worker Details</p>
                      {request.unionId && <p className="text-sm text-gray-600">Union ID: {request.unionId}</p>}
                      {request.bio && <p className="text-sm text-gray-600">Bio: {request.bio}</p>}
                      {request.unionCardUrl && (
                        <a
                          href={request.unionCardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <Eye className="h-4 w-4" /> View Union Card
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Reset All Verifications Modal */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-red-600">Reset All Verifications</h3>
            <p className="mb-4 text-gray-600">
              This will reset the verification status for <strong>ALL users</strong> to &quot;Not Verified&quot;. 
              This action cannot be undone.
            </p>
            <p className="mb-4 text-sm text-gray-500">
              All role-specific verifications (Filmmaker, Lender, Crew, Influencer) will also be reset.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetAllModal(false)}
                disabled={resetting}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllVerifications}
                disabled={resetting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Verification Modal */}
      {showRoleVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Verification</h3>
                <p className="text-sm text-gray-500">{showRoleVerificationModal.displayName}</p>
              </div>
              <button
                onClick={() => setShowRoleVerificationModal(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Toggle verification status for each role. Changes are saved immediately.
            </p>

            <div className="space-y-3">
              {(['filmmaker', 'lender', 'worker', 'influencer', 'store'] as const).map((role) => {
                const roleNames: Record<string, string> = {
                  filmmaker: 'Filmmaker',
                  lender: 'Gear Renter',
                  worker: 'Film Worker',
                  influencer: 'Influencer',
                  store: 'Store Owner',
                };
                const isVerified = roleVerifications[role] || false;
                return (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {isVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{roleNames[role]}</p>
                        <p className="text-xs text-gray-500">
                          {isVerified ? 'Verified' : 'Not Verified'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleRoleVerification(role, !isVerified)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        isVerified
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {isVerified ? 'Revoke' : 'Verify'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleSetAllRoles(false)}
                className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Revoke All
              </button>
              <button
                onClick={() => handleSetAllRoles(true)}
                className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Verify All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Users Modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Duplicate Users</h3>
                  <p className="text-sm text-gray-500">
                    {loadingDuplicates ? 'Scanning...' : `Found ${duplicateGroups.length} phone numbers with duplicate accounts`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDuplicatesModal(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {loadingDuplicates ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                </div>
              ) : duplicateGroups.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <p className="mt-4 text-lg font-medium text-gray-900">No Duplicates Found</p>
                  <p className="text-gray-500">All users have unique phone numbers.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicateGroups.map((group) => (
                    <div key={group.phone} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-orange-600" />
                          <span className="font-medium text-gray-900">{group.phone}</span>
                          <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-800">
                            {group.duplicateCount} accounts
                          </span>
                        </div>
                        <button
                          onClick={() => handleCleanupDuplicate(group.phone)}
                          disabled={cleaningUp === group.phone}
                          className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {cleaningUp === group.phone ? 'Cleaning...' : 'Clean Up'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {group.users.map((user) => (
                          <div
                            key={user.uid}
                            className={`flex items-center justify-between rounded-lg p-2 ${
                              user.uid === group.bestUserId
                                ? 'border-2 border-green-500 bg-green-50'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                                {user.displayName?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.displayName || <span className="italic text-gray-400">No name</span>}
                                </p>
                                <p className="text-xs text-gray-500">ID: {user.uid.slice(0, 12)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {user.uid === group.bestUserId && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  Keep
                                </span>
                              )}
                              {user.uid !== group.bestUserId && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                  Delete
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                user.verificationStatus === 'verified'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {user.verificationStatus || 'notVerified'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-gray-500">
                Cleanup keeps the best profile (with name, terms accepted, verified) and deletes others.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDuplicatesModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Close
                </button>
                {duplicateGroups.length > 0 && (
                  <button
                    onClick={handleCleanupAllDuplicates}
                    disabled={cleaningUpAll}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {cleaningUpAll ? 'Cleaning All...' : 'Clean Up All'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Verification Modal */}
      {roleVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">
                {roleVerifyModal.role.charAt(0).toUpperCase() + roleVerifyModal.role.slice(1)} Verification
              </h3>
              <button onClick={() => setRoleVerifyModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">User:</span> {roleVerifyModal.user.displayName || roleVerifyModal.user.filmgridId || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Current Status:</span>{' '}
                  <span className={
                    isRoleVerified(roleVerifyModal.user, roleVerifyModal.role) ? 'text-green-600' :
                    isRolePending(roleVerifyModal.user, roleVerifyModal.role) ? 'text-orange-500' : 'text-red-500'
                  }>
                    {isRoleVerified(roleVerifyModal.user, roleVerifyModal.role) ? 'Verified' :
                     isRolePending(roleVerifyModal.user, roleVerifyModal.role) ? 'Pending' : 'Not Verified'}
                  </span>
                </p>
              </div>
              
              <p className="mb-4 text-sm text-gray-500">Select an action for this role verification:</p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleRoleVerificationUpdate(roleVerifyModal.user, roleVerifyModal.role, 'verified')}
                  className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve / Verify
                </button>
                <button
                  onClick={() => handleRoleVerificationUpdate(roleVerifyModal.user, roleVerifyModal.role, 'pending')}
                  className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white hover:bg-orange-600"
                >
                  <Clock className="h-4 w-4" />
                  Set to Pending
                </button>
                <button
                  onClick={() => handleRoleVerificationUpdate(roleVerifyModal.user, roleVerifyModal.role, 'rejected')}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
            
            <div className="flex justify-end border-t p-4">
              <button
                onClick={() => setRoleVerifyModal(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
