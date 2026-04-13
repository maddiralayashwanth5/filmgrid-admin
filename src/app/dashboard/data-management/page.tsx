'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, Database, CheckCircle } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const DATA_CATEGORIES = [
  { id: 'users', label: 'Users', collection: 'users', description: 'All user accounts and profiles', dangerous: true },
  { id: 'equipment', label: 'Equipment', collection: 'equipment', description: 'All lender equipment listings' },
  { id: 'bookings', label: 'Bookings', collection: 'bookings', description: 'All rental bookings' },
  { id: 'orders', label: 'Orders', collection: 'orders', description: 'All store orders' },
  { id: 'jobs', label: 'Jobs', collection: 'jobs', description: 'All job postings' },
  { id: 'locations', label: 'Locations', collection: 'locations', description: 'All lease locations' },
  { id: 'promotions', label: 'Promotions', collection: 'promotions', description: 'All influencer promotions' },
  { id: 'competitions', label: 'Competitions', collection: 'competitions', description: 'All competitions' },
  { id: 'notifications', label: 'Notifications', collection: 'notifications', description: 'All push notifications' },
  { id: 'audit_logs', label: 'Audit Logs', collection: 'audit_logs', description: 'All audit log entries' },
  { id: 'banners', label: 'Banners', collection: 'banners', description: 'All banner images' },
  { id: 'app_config', label: 'App Config', collection: 'app_config', description: 'App configuration (popup banners, etc.)' },
  { id: 'projects', label: 'Projects', collection: 'projects', description: 'All user projects' },
  { id: 'contacts', label: 'Synced Contacts', collection: 'contacts', description: 'All synced contacts' },
  { id: 'referrals', label: 'Referrals', collection: 'referrals', description: 'All referral records' },
  { id: 'equipment_catalog', label: 'Equipment Catalog', collection: 'equipment_catalog', description: 'Master equipment catalog' },
  { id: 'store_catalogue', label: 'Store Catalogue', collection: 'store_catalogue', description: 'Store product catalogue' },
];

export default function DataManagementPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  const selectedCategoryData = DATA_CATEGORIES.find(c => c.id === selectedCategory);

  const handleDelete = async () => {
    if (!selectedCategory || !selectedCategoryData) return;
    if (confirmText !== 'DELETE') {
      setResult({ success: false, message: 'Please type DELETE to confirm' });
      return;
    }

    setIsDeleting(true);
    setResult(null);

    try {
      const collectionRef = collection(db, selectedCategoryData.collection);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        setResult({ success: true, message: 'Collection is already empty', count: 0 });
        setIsDeleting(false);
        setShowConfirm(false);
        setConfirmText('');
        return;
      }

      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      let deletedCount = 0;
      const docs = snapshot.docs;

      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach((document) => {
          batch.delete(doc(db, selectedCategoryData.collection, document.id));
        });

        await batch.commit();
        deletedCount += batchDocs.length;
      }

      setResult({ 
        success: true, 
        message: `Successfully deleted all ${selectedCategoryData.label} data`, 
        count: deletedCount 
      });
      setShowConfirm(false);
      setConfirmText('');
      setSelectedCategory('');
    } catch (error) {
      console.error('Error deleting data:', error);
      setResult({ 
        success: false, 
        message: `Error deleting data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }

    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Database className="w-7 h-7 text-red-400" />
          Data Management
        </h1>
        <p className="text-gray-400 mt-1">
          Bulk delete data from Firebase collections. Use with extreme caution.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
          <p className="text-red-300 text-sm mt-1">
            Deleting data is <strong>permanent and irreversible</strong>. Make sure you have a backup before proceeding.
            This action cannot be undone.
          </p>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-[#1a1a2e] rounded-xl shadow-lg border border-[#2a2a45] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Select Data Category to Delete</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setShowConfirm(false);
                setConfirmText('');
                setResult(null);
              }}
              className="w-full px-4 py-3 bg-[#252540] border border-[#3a3a55] rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">-- Select a category --</option>
              {DATA_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label} {category.dangerous ? '⚠️' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedCategoryData && (
            <div className="bg-[#252540] rounded-lg p-4 border border-[#3a3a55]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{selectedCategoryData.label}</h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedCategoryData.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Collection: <code className="bg-[#1a1a2e] px-1 rounded">{selectedCategoryData.collection}</code>
                  </p>
                </div>
                {selectedCategoryData.dangerous && (
                  <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded-full border border-red-700/50">
                    High Risk
                  </span>
                )}
              </div>
            </div>
          )}

          {selectedCategory && !showConfirm && (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Trash2 className="w-5 h-5" />
              Delete All {selectedCategoryData?.label} Data
            </button>
          )}

          {showConfirm && (
            <div className="space-y-4 p-4 bg-red-900/20 rounded-lg border border-red-700/50">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Confirm Deletion</span>
              </div>
              <p className="text-sm text-gray-300">
                You are about to delete <strong>ALL</strong> documents in the <strong>{selectedCategoryData?.label}</strong> collection.
                This action is permanent and cannot be undone.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type <span className="text-red-400 font-mono">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-2 bg-[#252540] border border-[#3a3a55] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                  className="flex-1 py-2 px-4 bg-[#252540] text-gray-300 rounded-lg hover:bg-[#2a2a50] transition-colors border border-[#3a3a55]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || confirmText !== 'DELETE'}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-900/30 border-green-700/50' 
                : 'bg-red-900/30 border-red-700/50'
            }`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                  {result.message}
                </span>
              </div>
              {result.count !== undefined && result.count > 0 && (
                <p className="text-sm text-gray-400 mt-1 ml-7">
                  {result.count} document(s) deleted
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-400 mb-2">Important Notes:</h3>
        <ul className="list-disc list-inside text-sm text-blue-300 space-y-1">
          <li>Deleting Users will remove all user accounts - they will need to re-register</li>
          <li>Deleting Equipment will remove all lender listings</li>
          <li>Subcollections within documents are NOT automatically deleted</li>
          <li>Consider exporting data before deletion for backup purposes</li>
          <li>This operation may take time for large collections</li>
        </ul>
      </div>
    </div>
  );
}
