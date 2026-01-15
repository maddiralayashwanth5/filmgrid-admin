'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  X,
  ShieldCheck,
  ShieldX,
  Clock,
  Camera,
  Briefcase,
  Star,
  Film,
  Store,
} from 'lucide-react';
import { 
  getRoleVerifications, 
  approveRoleVerification, 
  rejectRoleVerification,
  type RoleVerificationType,
  type RoleVerificationRequest,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

type StatusFilter = 'pending' | 'verified' | 'rejected';

const roleConfig: Record<RoleVerificationType, { name: string; icon: typeof Film; color: string }> = {
  filmmaker: { name: 'Filmmaker', icon: Film, color: 'blue' },
  lender: { name: 'Lender', icon: Camera, color: 'green' },
  worker: { name: 'Crew', icon: Briefcase, color: 'orange' },
  influencer: { name: 'Influencer', icon: Star, color: 'pink' },
  store: { name: 'Store', icon: Store, color: 'emerald' },
};

export default function VerificationPage() {
  const [requests, setRequests] = useState<RoleVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleVerificationType>('filmmaker');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedRequest, setSelectedRequest] = useState<RoleVerificationRequest | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { user: adminUser } = useAuth();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getRoleVerifications(roleFilter, statusFilter, (data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roleFilter, statusFilter]);

  const handleApprove = async (request: RoleVerificationRequest) => {
    try {
      await approveRoleVerification(request, adminUser?.uid || '');
    } catch (error) {
      console.error('Error approving verification:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectRoleVerification(
        selectedRequest,
        adminUser?.uid || '',
        rejectNotes || 'Verification rejected by admin'
      );
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectNotes('');
    } catch (error) {
      console.error('Error rejecting verification:', error);
    }
  };

  const openImageModal = (url: string) => {
    setImageUrl(url);
    setShowImageModal(true);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Role Verification</h1>
        <p className="text-gray-600">Review and verify user documents by role</p>
      </div>

      {/* Role Filter Tabs */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Select Role</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(roleConfig) as RoleVerificationType[]).map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  roleFilter === role
                    ? `bg-${config.color}-100 text-${config.color}-700 ring-2 ring-${config.color}-500`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={roleFilter === role ? {
                  backgroundColor: config.color === 'blue' ? '#dbeafe' : 
                                   config.color === 'green' ? '#dcfce7' :
                                   config.color === 'orange' ? '#ffedd5' : 
                                   config.color === 'emerald' ? '#d1fae5' : '#fce7f3',
                  color: config.color === 'blue' ? '#1d4ed8' : 
                         config.color === 'green' ? '#15803d' :
                         config.color === 'orange' ? '#c2410c' : 
                         config.color === 'emerald' ? '#047857' : '#be185d',
                } : {}}
              >
                <Icon className="h-4 w-4" />
                {config.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-gray-700">Status</p>
        <div className="flex flex-wrap gap-2">
          {(['pending', 'verified', 'rejected'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? status === 'pending'
                    ? 'bg-orange-100 text-orange-700'
                    : status === 'verified'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'pending' && <Clock className="h-4 w-4" />}
              {status === 'verified' && <ShieldCheck className="h-4 w-4" />}
              {status === 'rejected' && <ShieldX className="h-4 w-4" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-white">
          <ShieldCheck className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">No {statusFilter} {roleConfig[roleFilter].name} verifications</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border bg-white p-6 shadow-sm">
              {/* Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                  {(request.displayName || 'U')[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{request.displayName || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{request.phone}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  roleFilter === 'filmmaker' ? 'bg-blue-100 text-blue-700' :
                  roleFilter === 'lender' ? 'bg-green-100 text-green-700' :
                  roleFilter === 'worker' ? 'bg-orange-100 text-orange-700' :
                  roleFilter === 'store' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-pink-100 text-pink-700'
                }`}>
                  {roleConfig[roleFilter].name.toUpperCase()}
                </span>
              </div>

              {/* Submitted Date */}
              <p className="mb-4 text-sm text-gray-500">
                Submitted {format(request.submittedAt, 'MMM d, yyyy h:mm a')}
              </p>

              {/* Lender Specific Info */}
              {roleFilter === 'lender' && (
                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Camera Details</p>
                  <p className="text-sm font-medium">{request.cameraBrand} {request.cameraModel}</p>
                  <p className="text-xs text-gray-600">Serial: {request.cameraSerialNumber}</p>
                  {request.cameraPhotoUrl && (
                    <div
                      onClick={() => openImageModal(request.cameraPhotoUrl!)}
                      className="mt-2 cursor-pointer overflow-hidden rounded-lg border"
                    >
                      <img
                        src={request.cameraPhotoUrl}
                        alt="Camera"
                        className="h-24 w-full object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Worker Specific Info */}
              {roleFilter === 'worker' && (
                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Crew Details</p>
                  <p className="text-sm font-medium">{request.category}</p>
                  <p className="text-xs text-gray-600">{request.experienceYears} years experience</p>
                  {request.isUnionMember && (
                    <div className="mt-2">
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Union: {request.unionName}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">ID: {request.unionId}</p>
                    </div>
                  )}
                  {!request.isUnionMember && (
                    <span className="mt-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                      Non-Union
                    </span>
                  )}
                  {request.unionCardUrl && (
                    <div
                      onClick={() => openImageModal(request.unionCardUrl!)}
                      className="mt-2 cursor-pointer overflow-hidden rounded-lg border"
                    >
                      <img
                        src={request.unionCardUrl}
                        alt="Union Card"
                        className="h-24 w-full object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Store Specific Info */}
              {roleFilter === 'store' && (
                <div className="mb-4 rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Store Details</p>
                  <p className="text-sm font-medium">{request.storeName}</p>
                  {request.gstin && (
                    <p className="text-xs text-gray-600">GSTIN: {request.gstin}</p>
                  )}
                  <p className="text-xs text-gray-600">Contact: {request.storeContact}</p>
                  <p className="text-xs text-gray-600 mt-1">{request.storeAddress}</p>
                  {request.storeImageUrl && (
                    <div
                      onClick={() => openImageModal(request.storeImageUrl!)}
                      className="mt-2 cursor-pointer overflow-hidden rounded-lg border"
                    >
                      <img
                        src={request.storeImageUrl}
                        alt="Store"
                        className="h-24 w-full object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ID Document */}
              {request.documentUrl && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">ID Document</p>
                  <div
                    onClick={() => openImageModal(request.documentUrl)}
                    className="cursor-pointer overflow-hidden rounded-lg border"
                  >
                    <img
                      src={request.documentUrl}
                      alt="ID Proof"
                      className="h-32 w-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Click to view full image</p>
                </div>
              )}

              {/* Actions */}
              {statusFilter === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectModal(true);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(request)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              )}

              {statusFilter === 'verified' && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="flex items-center gap-1 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </p>
                </div>
              )}

              {statusFilter === 'rejected' && (
                <button
                  onClick={() => handleApprove(request)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 py-2 text-sm font-medium text-green-600 hover:bg-green-100"
                >
                  <CheckCircle className="h-4 w-4" />
                  Re-verify & Approve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white">
            <button
              onClick={() => {
                setShowImageModal(false);
                setImageUrl('');
              }}
              className="absolute right-4 top-4 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={imageUrl}
              alt="Document"
              className="max-h-[85vh] w-auto"
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Reject Verification</h3>
            <p className="mb-4 text-gray-600">
              Rejecting {roleConfig[roleFilter].name} verification for <strong>{selectedRequest.displayName}</strong>
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
                  setSelectedRequest(null);
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
