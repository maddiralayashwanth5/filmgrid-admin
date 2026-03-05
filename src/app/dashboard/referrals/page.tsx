'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Plus, Minus, Gift, Users, TrendingUp, Award, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReferralItem {
  id: string;
  referrerId: string;
  referrerName: string;
  referredId: string;
  referredName: string;
  referredPhone: string;
  status: 'pending' | 'completed';
  creditsAwarded: number;
  createdAt: Date;
  completedAt?: Date;
}

interface UserItem {
  uid: string;
  displayName: string;
  phone: string;
  jobCredits: number;
  successfulReferrals: number;
  referralCreditsEarned: number;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditAction, setCreditAction] = useState<'add' | 'remove'>('add');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [creditsAmount, setCreditsAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Fetch referrals
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          referrerId: data.referrerId || '',
          referrerName: data.referrerName || 'Unknown',
          referredId: data.referredId || '',
          referredName: data.referredName || 'Unknown',
          referredPhone: data.referredPhone || '',
          status: data.status || 'pending',
          creditsAwarded: data.creditsAwarded || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        };
      });
      // Sort by createdAt descending
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setReferrals(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching referrals:', error);
      setLoading(false); // Stop loading even on error
    });
    return () => unsubscribe();
  }, []);

  // Fetch users
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName || data.name || 'Unknown',
          phone: data.phone || data.phoneNumber || '',
          jobCredits: data.jobCredits || 0,
          successfulReferrals: data.successfulReferrals || 0,
          referralCreditsEarned: data.referralCreditsEarned || 0,
        };
      });
      setUsers(items);
    });
    return () => unsubscribe();
  }, []);

  // Filter referrals
  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch = searchQuery === '' || 
      r.referrerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referredName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referredPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter users for modal
  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const lower = userSearch.toLowerCase();
    return u.displayName.toLowerCase().includes(lower) || u.phone.includes(userSearch);
  });

  // Stats
  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const totalCreditsAwarded = referrals.reduce((sum, r) => sum + r.creditsAwarded, 0);

  // Add or remove credits from user
  const handleCreditsAction = async () => {
    if (!selectedUser || !creditsAmount) return;
    
    const credits = parseInt(creditsAmount);
    if (isNaN(credits) || credits <= 0) {
      alert('Please enter a valid number of credits');
      return;
    }

    // Check if removing more than user has
    if (creditAction === 'remove' && credits > selectedUser.jobCredits) {
      alert(`User only has ${selectedUser.jobCredits} credits. Cannot remove ${credits}.`);
      return;
    }

    setProcessing(true);
    try {
      const creditChange = creditAction === 'add' ? credits : -credits;
      const currentCredits = selectedUser.jobCredits;
      const newCredits = currentCredits + creditChange;
      const reasonText = reason || (creditAction === 'add' ? 'Admin credit addition' : 'Admin credit removal');
      
      // Update user's job credits
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        jobCredits: increment(creditChange),
        updatedAt: Timestamp.now(),
      });

      // Log to credit_logs for admin audit
      await addDoc(collection(db, 'credit_logs'), {
        userId: selectedUser.uid,
        userName: selectedUser.displayName,
        credits: creditChange,
        type: creditAction === 'add' ? 'admin_add' : 'admin_remove',
        reason: reasonText,
        addedBy: 'admin',
        createdAt: Timestamp.now(),
      });

      // Also log to job_credit_transactions so it shows in mobile app
      await addDoc(collection(db, 'job_credit_transactions'), {
        userId: selectedUser.uid,
        type: creditAction === 'add' ? 'bonus' : 'refund',
        amount: creditChange,
        balanceBefore: currentCredits,
        balanceAfter: newCredits,
        status: 'completed',
        adminId: 'admin',
        notes: reasonText,
        createdAt: Timestamp.now(),
        completedAt: Timestamp.now(),
      });

      alert(`Successfully ${creditAction === 'add' ? 'added' : 'removed'} ${credits} credits ${creditAction === 'add' ? 'to' : 'from'} ${selectedUser.displayName}`);
      setShowCreditsModal(false);
      setSelectedUser(null);
      setCreditsAmount('');
      setReason('');
      setUserSearch('');
    } catch (error) {
      console.error('Error updating credits:', error);
      alert('Failed to update credits');
    }
    setProcessing(false);
  };

  // Mark referral as completed
  const handleCompleteReferral = async (referral: ReferralItem, credits: number) => {
    try {
      // Update referral status
      await updateDoc(doc(db, 'referrals', referral.id), {
        status: 'completed',
        creditsAwarded: credits,
        completedAt: Timestamp.now(),
      });

      // Update referrer's stats and credits
      await updateDoc(doc(db, 'users', referral.referrerId), {
        jobCredits: increment(credits),
        successfulReferrals: increment(1),
        referralCreditsEarned: increment(credits),
        updatedAt: Timestamp.now(),
      });

      alert('Referral marked as completed');
    } catch (error) {
      console.error('Error completing referral:', error);
      alert('Failed to complete referral');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referrals & Credits</h1>
          <p className="text-gray-500 text-sm mt-1">Manage user referrals and add credits</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setCreditAction('add'); setShowCreditsModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Credits
          </button>
          <button
            onClick={() => { setCreditAction('remove'); setShowCreditsModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Minus className="w-4 h-4" />
            Remove Credits
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="text-2xl font-bold">{totalReferrals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{completedReferrals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Credits Awarded</p>
              <p className="text-2xl font-bold">{totalCreditsAwarded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No referrals found
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{referral.referrerName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{referral.referredName}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{referral.referredPhone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        referral.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {referral.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {referral.creditsAwarded > 0 && (
                        <span className="text-amber-600 font-medium">+{referral.creditsAwarded}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {format(referral.createdAt, 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      {referral.status === 'pending' && (
                        <button
                          onClick={() => {
                            const credits = prompt('Enter credits to award:', '1');
                            if (credits) {
                              handleCompleteReferral(referral, parseInt(credits) || 1);
                            }
                          }}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credits Modal (Add/Remove) */}
      {showCreditsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {creditAction === 'add' ? 'Add Credits to User' : 'Remove Credits from User'}
              </h2>
              <button onClick={() => {
                setShowCreditsModal(false);
                setSelectedUser(null);
                setUserSearch('');
                setCreditsAmount('');
                setReason('');
              }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {!selectedUser ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search User</label>
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredUsers.slice(0, 20).map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => setSelectedUser(user)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span>{user.phone}</span>
                        <span className="text-amber-600">{user.jobCredits} credits</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedUser.displayName}</div>
                  <div className="text-sm text-gray-500">{selectedUser.phone}</div>
                  <div className="text-sm text-amber-600 mt-1">Current credits: {selectedUser.jobCredits}</div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-sm text-blue-600 mt-2"
                  >
                    Change user
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credits to {creditAction === 'add' ? 'Add' : 'Remove'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={creditAction === 'remove' ? selectedUser.jobCredits : undefined}
                    placeholder="Enter number of credits"
                    value={creditsAmount}
                    onChange={(e) => setCreditsAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {creditAction === 'remove' && (
                    <p className="text-xs text-gray-500 mt-1">Max: {selectedUser.jobCredits} credits</p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                  <input
                    type="text"
                    placeholder={creditAction === 'add' ? 'e.g., Promotional credits, Referral bonus' : 'e.g., Refund, Correction'}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreditsModal(false);
                      setSelectedUser(null);
                      setCreditsAmount('');
                      setReason('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreditsAction}
                    disabled={processing || !creditsAmount}
                    className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      creditAction === 'add' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {creditAction === 'add' ? 'Add Credits' : 'Remove Credits'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
