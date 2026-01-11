'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Image, Upload, X, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  HeroBanner,
} from '@/lib/firestore';

export default function BannersPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    order: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await getHeroBanners();
      setBanners(data);
    } catch (error) {
      console.error('Error loading banners:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await updateHeroBanner(editingBanner.id, formData);
      } else {
        await createHeroBanner({
          ...formData,
          order: banners.length,
        });
      }
      setShowModal(false);
      setEditingBanner(null);
      resetForm();
      loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  const handleEdit = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      isActive: banner.isActive,
      order: banner.order,
    });
    setPreviewUrl(banner.imageUrl || null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteHeroBanner(id);
        loadBanners();
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    try {
      await updateHeroBanner(banner.id, { isActive: !banner.isActive });
      loadBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const banner = banners[index];
    const prevBanner = banners[index - 1];
    try {
      await updateHeroBanner(banner.id, { order: prevBanner.order });
      await updateHeroBanner(prevBanner.id, { order: banner.order });
      loadBanners();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const banner = banners[index];
    const nextBanner = banners[index + 1];
    try {
      await updateHeroBanner(banner.id, { order: nextBanner.order });
      await updateHeroBanner(nextBanner.id, { order: banner.order });
      loadBanners();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      isActive: true,
      order: 0,
    });
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `banners/hero_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, filename);

      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Failed to upload image. Please try again.');
          setUploading(false);
        },
        async () => {
          // Get download URL
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData({ ...formData, imageUrl: downloadUrl });
          setPreviewUrl(downloadUrl);
          setUploading(false);
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show local preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      handleImageUpload(file);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, imageUrl: '' });
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddModal = () => {
    setEditingBanner(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hero Banners</h1>
          <p className="text-gray-600">Manage home screen hero banners displayed in the app</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Banner
        </button>
      </div>

      {/* Banners List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : banners.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <Image className="h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No banners yet</p>
          <button
            onClick={openAddModal}
            className="mt-2 text-blue-600 hover:underline"
          >
            Add your first banner
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm ${
                !banner.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{banner.title}</h3>
                <p className="text-xs text-gray-500">Image-only banner</p>
                {banner.linkUrl && (
                  <p className="mt-1 text-xs text-blue-600">{banner.linkUrl}</p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    banner.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {banner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === banners.length - 1}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(banner)}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100"
                  title={banner.isActive ? 'Deactivate' : 'Activate'}
                >
                  {banner.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(banner)}
                  className="rounded p-2 text-blue-600 hover:bg-blue-50"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">
              {editingBanner ? 'Edit Banner' : 'Add New Banner'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Note:</strong> Banners are image-only. Upload a complete banner image with any text/graphics already included.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Banner Name (for reference only)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., New Year Promo, Summer Sale"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">This name is for admin reference only, not shown in app</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Banner Image <span className="text-red-500">*</span></label>
                
                {/* Image Preview */}
                {(previewUrl || formData.imageUrl) && (
                  <div className="mt-2 relative">
                    <img
                      src={previewUrl || formData.imageUrl}
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Upload Button */}
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="banner-image-upload"
                  />
                  <label
                    htmlFor="banner-image-upload"
                    className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      uploading
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-blue-600">Uploading... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-600">Click to upload image</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Progress Bar */}
                {uploading && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Or enter URL manually */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Or enter image URL manually:</p>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      setPreviewUrl(e.target.value || null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs">
                  <p className="font-semibold text-blue-800">📐 Recommended Image Sizes:</p>
                  <ul className="mt-1 space-y-1 text-blue-700">
                    <li>• <strong>Hero Banner:</strong> 1200 x 400 px (3:1 ratio)</li>
                    <li>• <strong>Mobile optimized:</strong> 750 x 250 px minimum</li>
                    <li>• <strong>Format:</strong> JPG, PNG, or WebP</li>
                    <li>• <strong>Max file size:</strong> 2MB</li>
                  </ul>
                  <p className="mt-2 text-gray-600">Leave empty to use gradient background</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Link URL (Optional)</label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active (visible in app)
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBanner(null);
                    resetForm();
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingBanner ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
