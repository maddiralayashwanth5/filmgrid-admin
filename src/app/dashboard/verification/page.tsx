'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Eye,
  X,
  ShieldCheck,
  ShieldX,
  Clock,
} from 'lucide-react';
import { getUsersByVerificationStatus, verifyUserProfile } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { User, VerificationStatus } from '@/lib/types';

export default function VerificationPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus>('pending');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { user: adminUser } = useAuth();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getUsersByVerificationStatus(statusFilter, (data) => {
      // Filter to show only users with ID proof for pending
      const filtered = statusFilter === 'pending'
        ? data.filter((u) => u.idProofUrl)
        : data;
      setUsers(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [statusFilter]);

  const handleApprove = async (user: User) => {
    try {
      await verifyUserProfile(user.uid, adminUser?.uid || '', true);
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    try {
      await verifyUserProfile(
        selectedUser.uid,
        adminUser?.uid || '',
        false,
        rejectNotes || 'Verification rejected by admin'
      );
      setShowRejectModal(false);
      setSelectedUser(null);
      setRejectNotes('');
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const getIdProofTypeName = (type?: string) => {
    const types: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      driving_license: 'Driving License',
      voter_id: 'Voter ID',
    };
    return types[type || ''] || 'ID Document';
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile Verification</h1>
        <p className="text-gray-600">Review and verify user ID proofs</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['pending', 'verified', 'rejected', 'notVerified'] as VerificationStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === status
                ? status === 'pending'
                  ? 'bg-orange-100 text-orange-700'
                  : status === 'verified'
                  ? 'bg-green-100 text-green-700'
                  : status === 'notVerified'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'pending' && <Clock className="h-4 w-4" />}
            {status === 'verified' && <ShieldCheck className="h-4 w-4" />}
            {status === 'rejected' && <ShieldX className="h-4 w-4" />}
            {status === 'notVerified' && <ShieldX className="h-4 w-4" />}
            {status === 'notVerified' ? 'Not Verified' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-white">
          <ShieldCheck className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">No {statusFilter} verifications</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <div key={user.uid} className="rounded-xl border bg-white p-6 shadow-sm">
              {/* User Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    (user.displayName || user.filmgridId || 'U')[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{user.displayName || user.filmgridId || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{user.filmgridId}</p>
                </div>
                {getRoleBadge(user.role)}
              </div>

              {/* Contact Info */}
              <div className="mb-4 space-y-1 text-sm">
                <p className="text-gray-600">📱 {user.phoneNumber || 'No phone'}</p>
                {user.email && <p className="text-gray-600">✉️ {user.email}</p>}
                <p className="text-gray-500">Joined {format(user.createdAt, 'MMM d, yyyy')}</p>
              </div>

              {/* ID Proof */}
              {user.idProofUrl && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    {getIdProofTypeName(user.idProofType)}
                  </p>
                  <div
                    onClick={() => {
                      setSelectedUser(user);
                      setShowImageModal(true);
                    }}
                    className="cursor-pointer overflow-hidden rounded-lg border"
                  >
                    <img
                      src={user.idProofUrl}
                      alt="ID Proof"
                      className="h-40 w-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Click to view full image</p>
                </div>
              )}

              {/* Verification Notes (for rejected) */}
              {user.verificationStatus === 'rejected' && user.verificationNotes && (
                <div className="mb-4 rounded-lg bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-700">Rejection Reason:</p>
                  <p className="text-sm text-red-600">{user.verificationNotes}</p>
                </div>
              )}

              {/* Verified Info */}
              {user.verificationStatus === 'verified' && user.verifiedAt && (
                <div className="mb-4 rounded-lg bg-green-50 p-3">
                  <p className="flex items-center gap-1 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Verified on {format(user.verifiedAt, 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {/* Actions */}
              {(statusFilter === 'pending' && user.idProofUrl) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowRejectModal(true);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(user)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              )}

              {statusFilter === 'rejected' && (
                <button
                  onClick={() => handleApprove(user)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 py-2 text-sm font-medium text-green-600 hover:bg-green-100"
                >
                  <CheckCircle className="h-4 w-4" />
                  Re-verify & Approve
                </button>
              )}

              {statusFilter === 'notVerified' && !user.idProofUrl && (
                <div className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-500">
                  User has not submitted ID document yet
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedUser?.idProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white">
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedUser(null);
              }}
              className="absolute right-4 top-4 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedUser.idProofUrl}
              alt="ID Proof"
              className="max-h-[85vh] w-auto"
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Reject Verification</h3>
            <p className="mb-4 text-gray-600">
              Rejecting verification for <strong>{selectedUser.displayName}</strong>
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (e.g., Blurry image, ID not readable...)"
              className="mb-4 w-full rounded-lg border p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedUser(null);
                  setRejectNotes('');
                }}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
