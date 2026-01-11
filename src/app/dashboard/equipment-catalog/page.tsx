'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Camera,
  MoreVertical,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Upload,
  Loader2,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  getEquipmentCatalog,
  createEquipmentCatalogItem,
  updateEquipmentCatalogItem,
  deleteEquipmentCatalogItem,
  toggleEquipmentCatalogStatus,
  type EquipmentCatalogItem,
} from '@/lib/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const CATEGORIES = [
  'Cameras',
  'Lenses',
  'Lighting',
  'Audio',
  'Grip',
  'Drones',
  'Storage',
  'Accessories',
];

interface FormData {
  name: string;
  brand: string;
  category: string;
  description: string;
  suggestedDailyRate: number;
  isActive: boolean;
}

const initialFormData: FormData = {
  name: '',
  brand: '',
  category: '',
  description: '',
  suggestedDailyRate: 0,
  isActive: true,
};

export default function EquipmentCatalogPage() {
  const [catalog, setCatalog] = useState<EquipmentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentCatalogItem | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = getEquipmentCatalog((items) => {
      setCatalog(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Group catalog by category
  const groupedCatalog = useMemo(() => {
    const filtered = catalog.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const grouped: Record<string, EquipmentCatalogItem[]> = {};
    filtered.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Sort items within each category by brand then name
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort((a, b) => {
        if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
        return a.name.localeCompare(b.name);
      });
    });

    return grouped;
  }, [catalog, searchQuery, selectedCategory]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of selectedImages) {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `equipment_catalog/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      urls.push(downloadUrl);
    }
    return urls;
  };

  // Form handling
  const handleOpenModal = (item?: EquipmentCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        brand: item.brand,
        category: item.category,
        description: item.description,
        suggestedDailyRate: item.suggestedDailyRate,
        isActive: item.isActive,
      });
      setImagePreviewUrls(item.imageUrls || []);
    } else {
      setEditingItem(null);
      setFormData(initialFormData);
      setImagePreviewUrls([]);
    }
    setSelectedImages([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialFormData);
    setSelectedImages([]);
    setImagePreviewUrls([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brand || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrls = editingItem?.imageUrls || [];
      if (selectedImages.length > 0) {
        const newUrls = await uploadImages();
        imageUrls = [...imagePreviewUrls.filter((url) => url.startsWith('http')), ...newUrls];
      }

      if (editingItem) {
        await updateEquipmentCatalogItem(editingItem.id, {
          ...formData,
          imageUrls,
        });
      } else {
        await createEquipmentCatalogItem({
          ...formData,
          imageUrls,
        });
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving catalog item:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment from the catalog?')) return;
    try {
      await deleteEquipmentCatalogItem(id);
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleEquipmentCatalogStatus(id, !currentStatus);
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipment Catalog</h1>
        <p className="text-gray-600">
          Master list of equipment that lenders can choose from. Add cameras, lenses, and gear here.
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-4">
        <div className="rounded-lg bg-blue-50 px-4 py-2">
          <span className="text-2xl font-bold text-blue-700">{catalog.length}</span>
          <span className="ml-2 text-sm text-blue-600">Total Items</span>
        </div>
        <div className="rounded-lg bg-green-50 px-4 py-2">
          <span className="text-2xl font-bold text-green-700">
            {catalog.filter((i) => i.isActive).length}
          </span>
          <span className="ml-2 text-sm text-green-600">Active</span>
        </div>
        <div className="rounded-lg bg-gray-50 px-4 py-2">
          <span className="text-2xl font-bold text-gray-700">
            {new Set(catalog.map((i) => i.category)).size}
          </span>
          <span className="ml-2 text-sm text-gray-600">Categories</span>
        </div>
      </div>

      {/* Catalog List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {Object.keys(groupedCatalog)
            .sort()
            .map((category) => {
              const items = groupedCatalog[category];
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="rounded-lg border bg-gray-50">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-900">{category}</span>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {items.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 px-4 pb-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 rounded-lg border bg-white p-3 hover:bg-gray-50"
                        >
                          {/* Image */}
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
                            {item.imageUrls?.[0] ? (
                              <img
                                src={item.imageUrls[0]}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                <Camera className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.brand}</p>
                          </div>

                          {/* Suggested Rate */}
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₹{item.suggestedDailyRate}</p>
                            <p className="text-xs text-gray-500">suggested/day</p>
                          </div>

                          {/* Status */}
                          <div className="w-20">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                item.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="relative">
                            <button
                              onClick={() => setShowMenu(showMenu === item.id ? null : item.id)}
                              className="rounded p-1 hover:bg-gray-200"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                            {showMenu === item.id && (
                              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border bg-white py-1 shadow-xl">
                                <button
                                  onClick={() => {
                                    handleOpenModal(item);
                                    setShowMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Pencil className="h-3 w-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(item.id, item.isActive)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  {item.isActive ? (
                                    <>
                                      <ToggleLeft className="h-3 w-3" /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="h-3 w-3" /> Activate
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="flex w-full items-center gap-2 border-t px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          {Object.keys(groupedCatalog).length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No equipment in catalog. Click "Add Equipment" to get started.
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Equipment' : 'Add Equipment to Catalog'}
              </h2>
              <button onClick={handleCloseModal} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Equipment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Sony FX3, Canon R5, ARRI Alexa Mini"
                  required
                />
              </div>

              {/* Brand */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Brand <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Sony, Canon, ARRI, RED"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Brief description of the equipment..."
                />
              </div>

              {/* Suggested Daily Rate */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Suggested Daily Rate (₹)
                </label>
                <input
                  type="number"
                  value={formData.suggestedDailyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, suggestedDailyRate: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lenders can set their own rates, this is just a suggestion
                </p>
              </div>

              {/* Images */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Equipment Images
                </label>
                <div className="flex flex-wrap gap-2">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative h-20 w-20">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500"
                  >
                    <Upload className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active (visible to lenders)
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingItem ? 'Update' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
