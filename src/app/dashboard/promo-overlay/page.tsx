'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Plus, Edit2, Trash2, Eye, EyeOff, Calendar, ExternalLink, Upload, Loader2 } from 'lucide-react';

interface Promo {
  id: string;
  imageUrl: string;
  facebookUrl?: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export default function PromoOverlayPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [imageUrl, setImageUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    try {
      const promosRef = collection(db, 'promos');
      const snapshot = await getDocs(promosRef);
      const promosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate(),
      })) as Promo[];
      
      // Sort by created date, newest first
      promosData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setPromos(promosData);
    } catch (error) {
      console.error('Error loading promos:', error);
      alert('Failed to load promos');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!storage) {
      throw new Error('Storage not initialized');
    }
    const storageRef = ref(storage, `promos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let finalImageUrl = imageUrl;

      // Upload image if file is selected
      if (imageFile) {
        finalImageUrl = await handleImageUpload(imageFile);
      }

      if (!finalImageUrl) {
        alert('Please provide an image URL or upload an image');
        setUploading(false);
        return;
      }

      const promoData = {
        imageUrl: finalImageUrl,
        facebookUrl: facebookUrl || null,
        isActive: true,
        expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
        createdAt: serverTimestamp(),
      };

      if (editingPromo) {
        // Update existing promo
        await updateDoc(doc(db, 'promos', editingPromo.id), promoData);
      } else {
        // Create new promo
        await addDoc(collection(db, 'promos'), promoData);
      }

      // Reset form
      setImageUrl('');
      setFacebookUrl('');
      setExpiresAt('');
      setImageFile(null);
      setShowModal(false);
      setEditingPromo(null);
      
      // Reload promos
      await loadPromos();
    } catch (error) {
      console.error('Error saving promo:', error);
      alert('Failed to save promo');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setImageUrl(promo.imageUrl);
    setFacebookUrl(promo.facebookUrl || '');
    setExpiresAt(promo.expiresAt ? promo.expiresAt.toISOString().split('T')[0] : '');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo?')) return;

    try {
      await deleteDoc(doc(db, 'promos', id));
      await loadPromos();
    } catch (error) {
      console.error('Error deleting promo:', error);
      alert('Failed to delete promo');
    }
  };

  const toggleActive = async (promo: Promo) => {
    try {
      await updateDoc(doc(db, 'promos', promo.id), {
        isActive: !promo.isActive,
      });
      await loadPromos();
    } catch (error) {
      console.error('Error toggling promo:', error);
      alert('Failed to update promo');
    }
  };

  const isExpired = (promo: Promo) => {
    if (!promo.expiresAt) return false;
    return new Date() > promo.expiresAt;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promo Overlay</h1>
          <p className="mt-2 text-gray-600">
            Manage full-screen promotional posters with Facebook links
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPromo(null);
            setImageUrl('');
            setFacebookUrl('');
            setExpiresAt('');
            setImageFile(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Promo
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total Promos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{promos.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Active Promos</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {promos.filter(p => p.isActive && !isExpired(p)).length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Expired Promos</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {promos.filter(p => isExpired(p)).length}
          </p>
        </div>
      </div>

      {/* Promos List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : promos.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm border border-gray-200">
          <p className="text-gray-500">No promos yet. Create your first promo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-[3/4] bg-gray-100">
                <img
                  src={promo.imageUrl}
                  alt="Promo"
                  className="h-full w-full object-contain"
                />
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {isExpired(promo) ? (
                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
                      Expired
                    </span>
                  ) : promo.isActive ? (
                    <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-500 px-3 py-1 text-xs font-medium text-white">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                {/* Facebook Link */}
                {promo.facebookUrl && (
                  <a
                    href={promo.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Facebook Link
                  </a>
                )}

                {/* Expiry Date */}
                {promo.expiresAt && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Expires: {promo.expiresAt.toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(promo)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      promo.isActive
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {promo.isActive ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(promo)}
                    className="rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingPromo ? 'Edit Promo' : 'Create New Promo'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {/* OR */}
              <div className="text-center text-sm text-gray-500">OR</div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/poster.jpg"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Facebook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook URL (Optional)
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/events/123456"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPromo(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    editingPromo ? 'Update Promo' : 'Create Promo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
