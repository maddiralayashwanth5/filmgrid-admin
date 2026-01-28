'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  Camera,
  ChevronDown,
  ChevronRight,
  Package,
  Pencil,
  X,
  Search,
  Plus,
  Upload,
  Loader2,
  Users,
} from 'lucide-react';
import {
  getEquipment,
  getPendingEquipment,
  verifyEquipment,
  toggleEquipmentStatus,
  deleteEquipment,
  updateEquipmentTitle,
  createEquipment,
  updateEquipment,
  getEquipmentCategories,
  createEquipmentCategory,
} from '@/lib/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { Equipment } from '@/lib/types';

// Default categories (display names that map to Flutter enum names)
const DEFAULT_CATEGORIES = [
  'Cameras',      // -> camera
  'Lenses',       // -> lens
  'Lighting',     // -> lighting
  'Audio',        // -> audio
  'Grip',         // -> grip (tripods, stabilizers)
  'Drones',       // -> drone
  'Storage',      // -> storage
  'Accessories',  // -> accessories
];

interface EquipmentFormData {
  title: string;
  brand: string;
  category: string;
  description: string;
  dailyRate: number;
  city: string;
  isActive: boolean;
}

const initialFormData: EquipmentFormData = {
  title: '',
  brand: '',
  category: '',
  description: '',
  dailyRate: 0,
  city: '',
  isActive: true,
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [allEquipmentCount, setAllEquipmentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [allLendersCount, setAllLendersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [initialExpanded, setInitialExpanded] = useState(false);

  // Equipment creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Owners modal state
  const [showOwnersModal, setShowOwnersModal] = useState(false);
  const [selectedProductOwners, setSelectedProductOwners] = useState<Equipment[]>([]);
  const [selectedProductName, setSelectedProductName] = useState('');

  // Subscribe to both all equipment and pending equipment for counts
  useEffect(() => {
    // Get all equipment count and lenders count
    const unsubAll = getEquipment((data) => {
      setAllEquipmentCount(data.length);
      const ownerIds = new Set(data.map(item => item.ownerId).filter(Boolean));
      setAllLendersCount(ownerIds.size);
    });
    
    // Get pending equipment count
    const unsubPending = getPendingEquipment((data) => {
      setPendingCount(data.length);
    });

    // Get equipment categories
    const unsubCategories = getEquipmentCategories((cats) => {
      if (cats.length > 0) {
        // Merge with default categories
        const merged = [...new Set([...DEFAULT_CATEGORIES, ...cats])];
        setAvailableCategories(merged.sort());
      }
    });
    
    return () => {
      unsubAll();
      unsubPending();
      unsubCategories();
    };
  }, []);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedImages((prev) => [...prev, ...files]);

    // Create preview URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload images to Firebase Storage
  const uploadImages = async (category: string): Promise<string[]> => {
    const urls: string[] = [];
    const categoryFolder = category.toLowerCase().replace(/\s+/g, '_');

    for (const file of selectedImages) {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `equipment/${categoryFolder}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      urls.push(downloadUrl);
    }

    return urls;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.brand) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create category if it's new
      if (!availableCategories.includes(formData.category)) {
        await createEquipmentCategory(formData.category);
      }

      // Upload images
      let photoUrls: string[] = [];
      if (selectedImages.length > 0) {
        photoUrls = await uploadImages(formData.category);
      }

      if (editingEquipment) {
        // Update existing equipment
        await updateEquipment(editingEquipment.id, {
          ...formData,
          photos: photoUrls.length > 0 ? photoUrls : editingEquipment.photos,
        });
      } else {
        // Create new equipment
        await createEquipment({
          ...formData,
          photos: photoUrls,
        });
      }

      // Reset form
      setFormData(initialFormData);
      setSelectedImages([]);
      setImagePreviewUrls([]);
      setEditingEquipment(null);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Failed to save equipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const handleEditEquipment = (item: Equipment) => {
    setEditingEquipment(item);
    setFormData({
      title: item.title,
      brand: item.brand,
      category: item.category,
      description: item.description,
      dailyRate: item.dailyRate,
      city: item.city,
      isActive: item.isActive,
    });
    setImagePreviewUrls(item.photos || []);
    setSelectedImages([]);
    setShowCreateModal(true);
    setShowMenu(null);
  };

  // Close modal and reset
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormData(initialFormData);
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setEditingEquipment(null);
    setNewCategory('');
  };

  // Add new category
  const handleAddCategory = () => {
    if (newCategory.trim() && !availableCategories.includes(newCategory.trim())) {
      setAvailableCategories((prev) => [...prev, newCategory.trim()].sort());
      setFormData((prev) => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
    }
  };

  // Subscribe to filtered equipment for display
  useEffect(() => {
    setLoading(true);
    const unsubscribe = filter === 'pending'
      ? getPendingEquipment((data) => {
          setEquipment(data);
          setLoading(false);
        })
      : getEquipment((data) => {
          setEquipment(data);
          setLoading(false);
        });
    return () => unsubscribe();
  }, [filter]);

  // Normalize category names to merge similar ones
  const normalizeCategory = (cat: string | undefined): string => {
    const raw = (cat?.trim() || 'Uncategorized').toLowerCase();
    
    // Merge similar categories
    if (raw === 'lens' || raw === 'lenses') return 'Lenses';
    if (raw === 'light' || raw === 'lights' || raw === 'lighting') return 'Lights';
    if (raw === 'camera' || raw === 'cameras') return 'Cameras';
    if (raw === 'audio' || raw === 'sound') return 'Audio';
    if (raw === 'drone' || raw === 'drones') return 'Drones';
    if (raw === 'tripod' || raw === 'tripods' || raw === 'stabilizer' || raw === 'stabilizers' || raw === 'tripods & stabilizers') return 'Tripods & Stabilizers';
    if (raw === 'accessory' || raw === 'accessories') return 'Accessories';
    
    // Capitalize first letter for others
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // Normalize brand names to merge similar ones
  const normalizeBrand = (brand: string | undefined): string => {
    const raw = (brand?.trim() || 'Unknown').toLowerCase();
    
    // Merge Sony variants (sony, sony_g, sony_g_m, sony_ff, etc.)
    if (raw.startsWith('sony')) return 'Sony';
    
    // Merge RED variants (red, RED)
    if (raw === 'red') return 'RED';
    
    // Merge Canon variants
    if (raw.startsWith('canon')) return 'Canon';
    
    // Merge ARRI variants
    if (raw.startsWith('arri')) return 'ARRI';
    
    // Merge Zeiss variants
    if (raw.startsWith('zeiss')) return 'Zeiss';
    
    // Merge Blackmagic variants
    if (raw.startsWith('blackmagic')) return 'Blackmagic';
    
    // Capitalize first letter for others
    return brand?.trim() || 'Unknown';
  };

  // Extract unique categories from actual equipment data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    equipment.forEach(item => {
      cats.add(normalizeCategory(item.category));
    });
    return Array.from(cats).sort();
  }, [equipment]);


  // Auto-expand all categories on first load
  useEffect(() => {
    if (!initialExpanded && categories.length > 0) {
      setExpandedCategories(new Set(categories));
      setInitialExpanded(true);
    }
  }, [categories, initialExpanded]);

  // Normalize title to merge similar product names
  const normalizeTitle = (title: string | undefined): string => {
    return (title?.trim() || 'Unknown').toLowerCase();
  };

  // Group equipment by category -> brand -> product name (consolidated)
  const groupedEquipment = useMemo(() => {
    const filtered = searchQuery
      ? equipment.filter(e => 
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : equipment;

    const grouped: Record<string, Record<string, Record<string, Equipment[]>>> = {};

    filtered.forEach(item => {
      const category = normalizeCategory(item.category);
      const brand = normalizeBrand(item.brand);
      const titleKey = normalizeTitle(item.title);
      
      if (!grouped[category]) {
        grouped[category] = {};
      }
      if (!grouped[category][brand]) {
        grouped[category][brand] = {};
      }
      if (!grouped[category][brand][titleKey]) {
        grouped[category][brand][titleKey] = [];
      }
      grouped[category][brand][titleKey].push(item);
    });

    return grouped;
  }, [equipment, searchQuery]);

  // Get sorted brands for a category
  const getBrandsForCategory = (category: string): string[] => {
    const brands = groupedEquipment[category];
    if (!brands) return [];
    return Object.keys(brands).sort();
  };

  // Get products for a brand
  const getProductsForBrand = (category: string, brand: string): { title: string; items: Equipment[] }[] => {
    const products = groupedEquipment[category]?.[brand];
    if (!products) return [];
    return Object.entries(products).map(([title, items]) => ({
      title: items[0]?.title || title, // Use actual title from first item
      items,
    })).sort((a, b) => a.title.localeCompare(b.title));
  };

  // Get item count for a category
  const getCategoryCount = (category: string): number => {
    const brands = groupedEquipment[category];
    if (!brands) return 0;
    return Object.values(brands).reduce((sum, products) => {
      return sum + Object.values(products).reduce((pSum, items) => pSum + items.length, 0);
    }, 0);
  };

  // Get unique product count for a brand
  const getBrandProductCount = (category: string, brand: string): number => {
    const products = groupedEquipment[category]?.[brand];
    if (!products) return 0;
    return Object.keys(products).length;
  };

  // Open owners modal
  const handleShowOwners = (productName: string, owners: Equipment[]) => {
    setSelectedProductName(productName);
    setSelectedProductOwners(owners);
    setShowOwnersModal(true);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const toggleBrand = (key: string) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categories));
    // Expand all brands too
    const allBrandKeys = new Set<string>();
    categories.forEach(cat => {
      getBrandsForCategory(cat).forEach(brand => {
        allBrandKeys.add(`${cat}:${brand}`);
      });
    });
    setExpandedBrands(allBrandKeys);
  };
  
  const collapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedBrands(new Set());
  };

  const handleVerify = async (id: string, approved: boolean) => {
    try {
      await verifyEquipment(id, approved);
      setShowMenu(null);
    } catch (error) {
      console.error('Error verifying equipment:', error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleEquipmentStatus(id, !currentStatus);
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await deleteEquipment(id);
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting equipment:', error);
    }
  };

  const handleStartEdit = (item: Equipment) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setShowMenu(null);
  };

  const handleSaveTitle = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await updateEquipmentTitle(id, editTitle.trim());
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const renderEquipmentCard = (item: Equipment) => (
    <div
      key={item.id}
      className="flex items-center gap-4 rounded-lg border bg-white p-4 hover:bg-gray-50"
    >
      {/* Image */}
      <div className="w-14 shrink-0">
        <div
          onClick={() => {
            setSelectedEquipment(item);
            setShowImageModal(true);
          }}
          className="aspect-square w-14 cursor-pointer overflow-hidden rounded-lg border"
        >
          {item.photos?.[0] ? (
            <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <Camera className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Title & Brand */}
      <div className="min-w-0 flex-1">
        {editingId === item.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle(item.id);
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <button
              onClick={() => handleSaveTitle(item.id)}
              className="rounded bg-blue-600 p-1 text-white hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="rounded bg-gray-200 p-1 hover:bg-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <p className="text-xs text-gray-500">{item.brand}</p>
          </>
        )}
      </div>

      {/* Owner */}
      <div className="hidden w-28 shrink-0 md:block">
        <p className="text-xs text-gray-600">{item.ownerName || 'Unknown'}</p>
      </div>

      {/* Price */}
      <div className="w-20 shrink-0 text-right">
        <span className="text-sm font-semibold text-gray-900">₹{item.dailyRate || (item as any).pricePerDay || 0}</span>
      </div>

      {/* City */}
      <div className="hidden w-24 shrink-0 lg:block">
        <span className="text-xs text-gray-600">{item.city}</span>
      </div>

      {/* Status */}
      <div className="flex w-28 shrink-0 items-center gap-2">
        {item.isVerified ? (
          <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-orange-500" />
        )}
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
            item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Actions */}
      <div className="w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(showMenu === item.id ? null : item.id);
            }}
            className="rounded p-1 hover:bg-gray-200"
          >
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </button>
          {showMenu === item.id && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-white py-1 shadow-xl">
              <button
                onClick={() => handleEditEquipment(item)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => handleStartEdit(item)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3 w-3" /> Rename
              </button>
              {!item.isVerified ? (
                <button
                  onClick={() => handleVerify(item.id, true)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="h-3 w-3" /> Approve
                </button>
              ) : (
                <button
                  onClick={() => handleVerify(item.id, false)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-orange-600 hover:bg-orange-50"
                >
                  <XCircle className="h-3 w-3" /> Revoke
                </button>
              )}
              <button
                onClick={() => handleToggleStatus(item.id, item.isActive)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50"
              >
                {item.isActive ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
                {item.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="flex w-full items-center gap-2 border-t px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
        <p className="text-gray-600">Manage and verify equipment listings</p>
      </div>

      {/* Filter & Search */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({allEquipmentCount}) • {allLendersCount} Lenders
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            Collapse All
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Equipment
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const categoryCount = getCategoryCount(category);
            if (categoryCount === 0) return null;

            const isExpanded = expandedCategories.has(category);
            const brands = getBrandsForCategory(category);

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
                    <span className="text-xs text-gray-400">({brands.length} brands)</span>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {categoryCount}
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-2 px-4 pb-4">
                    {brands.map((brand) => {
                      const brandKey = `${category}:${brand}`;
                      const isBrandExpanded = expandedBrands.has(brandKey);
                      const products = getProductsForBrand(category, brand);
                      const productCount = getBrandProductCount(category, brand);

                      return (
                        <div key={brandKey} className="rounded-lg border bg-white">
                          <button
                            onClick={() => toggleBrand(brandKey)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-2">
                              {isBrandExpanded ? (
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              )}
                              <span className="text-sm font-medium text-gray-700">{brand}</span>
                            </div>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              {productCount} products
                            </span>
                          </button>

                          {isBrandExpanded && (
                            <div className="border-t px-3 pb-3 pt-2">
                              {/* Header Row */}
                              <div className="mb-2 flex items-center gap-4 border-b pb-2 text-xs font-medium text-gray-400">
                                <div className="w-14 shrink-0">Img</div>
                                <div className="min-w-0 flex-1">Product</div>
                                <div className="w-24 shrink-0 text-center">Owners</div>
                                <div className="w-24 shrink-0 text-right">Rate Range</div>
                                <div className="w-28 shrink-0">Status</div>
                              </div>
                              <div className="space-y-1">
                                {products.map(({ title, items }) => {
                                  const firstItem = items[0];
                                  const ownerCount = items.length;
                                  const minRate = Math.min(...items.map(i => i.dailyRate || 0));
                                  const maxRate = Math.max(...items.map(i => i.dailyRate || 0));
                                  const activeCount = items.filter(i => i.isActive).length;
                                  const verifiedCount = items.filter(i => i.isVerified).length;

                                  return (
                                    <div
                                      key={title}
                                      className="flex items-center gap-4 rounded-lg border bg-white p-3 hover:bg-gray-50 cursor-pointer"
                                      onClick={() => handleShowOwners(title, items)}
                                    >
                                      {/* Image */}
                                      <div className="w-14 shrink-0">
                                        <div className="aspect-square w-14 overflow-hidden rounded-lg border">
                                          {firstItem.photos?.[0] ? (
                                            <img src={firstItem.photos[0]} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                              <Camera className="h-6 w-6 text-gray-400" />
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Title */}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900">{firstItem.title}</p>
                                        <p className="text-xs text-gray-500">{brand}</p>
                                      </div>

                                      {/* Owners Count */}
                                      <div className="w-24 shrink-0 text-center">
                                        <button
                                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleShowOwners(firstItem.title, items);
                                          }}
                                        >
                                          <Users className="h-3 w-3" />
                                          {ownerCount} {ownerCount === 1 ? 'owner' : 'owners'}
                                        </button>
                                      </div>

                                      {/* Rate Range */}
                                      <div className="w-24 shrink-0 text-right">
                                        {minRate === maxRate ? (
                                          <span className="text-sm font-semibold text-gray-900">₹{minRate}</span>
                                        ) : (
                                          <span className="text-sm font-semibold text-gray-900">₹{minRate} - ₹{maxRate}</span>
                                        )}
                                      </div>

                                      {/* Status */}
                                      <div className="w-28 shrink-0 flex items-center gap-2">
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                          {activeCount} active
                                        </span>
                                        {verifiedCount > 0 && (
                                          <span title={`${verifiedCount} verified`}>
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(groupedEquipment).length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No equipment found
            </div>
          )}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedEquipment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setShowImageModal(false);
            setSelectedEquipment(null);
          }}
        >
          <div className="max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">{selectedEquipment.title}</h3>
            
            {/* Equipment Photos */}
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-gray-700">Equipment Photos</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {selectedEquipment.photos?.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="rounded-lg"
                  />
                ))}
              </div>
            </div>

            {/* Serial Number Photo for Verification */}
            {(selectedEquipment as any).serialNumberUrl && (
              <div className="mb-4 rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-700">
                  <span className="rounded bg-orange-200 px-2 py-0.5 text-xs">VERIFICATION</span>
                  Serial Number Photo
                </h4>
                <img
                  src={(selectedEquipment as any).serialNumberUrl}
                  alt="Serial Number"
                  className="max-h-64 rounded-lg border"
                />
                <p className="mt-2 text-xs text-orange-600">
                  Verify this serial number matches the equipment before approving.
                </p>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Description:</strong> {selectedEquipment.description}</p>
              <p><strong>Daily Rate:</strong> ₹{selectedEquipment.dailyRate || (selectedEquipment as any).pricePerDay}</p>
              <p><strong>City:</strong> {selectedEquipment.city}</p>
              <p><strong>Verification Status:</strong> {selectedEquipment.isVerified ? 
                <span className="text-green-600">Verified</span> : 
                <span className="text-orange-600">Pending Verification</span>}
              </p>
            </div>

            {/* Verification Actions */}
            {!selectedEquipment.isVerified && (
              <div className="mt-4 flex gap-2 border-t pt-4">
                <button
                  onClick={() => {
                    handleVerify(selectedEquipment.id, true);
                    setShowImageModal(false);
                    setSelectedEquipment(null);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" /> Approve Equipment
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedEquipment.id);
                    setShowImageModal(false);
                    setSelectedEquipment(null);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Reject & Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Equipment Modal */}
      {showCreateModal && (
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
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Sony A7S III"
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
                  placeholder="e.g., Sony"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex-1 rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select category</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Or add new category..."
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Equipment description..."
                />
              </div>

              {/* Daily Rate & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Daily Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Mumbai"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    formData.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {formData.isActive ? (
                    <>
                      <ToggleRight className="h-4 w-4" /> Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" /> Inactive
                    </>
                  )}
                </button>
              </div>

              {/* Images */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Images
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-gray-500 hover:border-blue-400 hover:text-blue-500"
                >
                  <Upload className="h-5 w-5" />
                  Click to upload images
                </button>

                {/* Image Previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="h-20 w-full rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {editingEquipment ? 'Update Equipment' : 'Create Equipment'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owners Modal */}
      {showOwnersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowOwnersModal(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedProductName}</h2>
                <p className="text-sm text-gray-500">{selectedProductOwners.length} owner{selectedProductOwners.length !== 1 ? 's' : ''} listing this equipment</p>
              </div>
              <button
                onClick={() => setShowOwnersModal(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Owners List */}
            <div className="space-y-3">
              {selectedProductOwners.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-gray-50"
                >
                  {/* Image */}
                  <div className="w-16 shrink-0">
                    <div className="aspect-square w-16 overflow-hidden rounded-lg border">
                      {item.photos?.[0] ? (
                        <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <Camera className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{item.ownerName || 'Unknown Owner'}</p>
                    <p className="text-sm text-gray-500">{item.city || 'Location not specified'}</p>
                  </div>

                  {/* Rate */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">₹{item.dailyRate || 0}</p>
                    <p className="text-xs text-gray-500">per day</p>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {item.isVerified ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-orange-500">
                        <XCircle className="h-3 w-3" /> Pending
                      </span>
                    )}
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
                      <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-white py-1 shadow-xl">
                        <button
                          onClick={() => {
                            handleEditEquipment(item);
                            setShowOwnersModal(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        {!item.isVerified ? (
                          <button
                            onClick={() => handleVerify(item.id, true)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(item.id, false)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-orange-600 hover:bg-orange-50"
                          >
                            <XCircle className="h-3 w-3" /> Revoke
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(item.id, item.isActive)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50"
                        >
                          {item.isActive ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex w-full items-center gap-2 border-t px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
