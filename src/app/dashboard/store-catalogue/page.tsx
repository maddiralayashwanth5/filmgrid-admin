'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Store,
  Plus,
  MoreVertical,
  Search,
  X,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Camera,
  Filter,
  IndianRupee,
  MapPin,
  Phone,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type ItemStatus = 'pending' | 'approved' | 'rejected' | 'sold';
type ItemType = 'equipment' | 'non-equipment';

interface StoreItem {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: ItemType;
  price: number;
  condition: string;
  location: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerFgId?: string;
  imageUrl?: string;
  images?: string[];
  status: ItemStatus;
  createdAt: Date;
  updatedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  source?: 'sales_items' | 'used_gear';
}

const EQUIPMENT_CATEGORIES = [
  'Used Equipment',
  'Cameras',
  'Lenses',
  'Lighting',
  'Audio',
  'Grip',
  'Drones',
  'Storage',
  'Accessories',
];

const NON_EQUIPMENT_CATEGORIES = [
  'Gels & Filters',
  'Cables & Electrical',
  'Bulbs & Lamps',
  'Diffusion Materials',
  'Consumables',
  'Props',
  'Costumes',
  'Other',
];

const statusColors: Record<ItemStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-purple-100 text-purple-700',
};

const conditionOptions = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];

export default function StoreCataloguePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'equipment' | 'non-equipment'>('all');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    itemType: 'equipment' as ItemType,
    price: '',
    condition: 'Good',
    location: '',
    sellerName: '',
    sellerPhone: '',
    sellerFgId: '',
    imageUrl: '',
    status: 'pending' as ItemStatus,
  });

  useEffect(() => {
    // Listen to both sales_items and used_gear collections
    const salesItemsQuery = query(collection(db, 'sales_items'), orderBy('createdAt', 'desc'));
    const usedGearQuery = query(collection(db, 'used_gear'), orderBy('createdAt', 'desc'));
    
    let salesItems: StoreItem[] = [];
    let usedGearItems: StoreItem[] = [];
    
    const unsubscribeSales = onSnapshot(salesItemsQuery, (snapshot) => {
      salesItems = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || '',
          description: data.description || '',
          category: data.category || '',
          itemType: data.itemType || 'equipment',
          price: data.price || 0,
          condition: data.condition || 'Good',
          location: data.location || '',
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || '',
          sellerPhone: data.sellerPhone || '',
          sellerFgId: data.sellerFgId || '',
          imageUrl: data.imageUrl || '',
          images: data.images || [],
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          approvedAt: data.approvedAt?.toDate(),
          source: 'sales_items' as const,
        };
      }) as StoreItem[];
      setItems([...salesItems, ...usedGearItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setLoading(false);
    }, (error) => {
      console.error('Error loading sales items:', error);
    });

    const unsubscribeUsedGear = onSnapshot(usedGearQuery, (snapshot) => {
      usedGearItems = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.name || data.title,
          description: data.description || '',
          category: data.category || '',
          itemType: data.type === 'Materials & Consumables' ? 'non-equipment' : 'equipment',
          price: data.price || 0,
          condition: data.condition || 'Good',
          location: '',
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || data.storeName || '',
          sellerPhone: '',
          imageUrl: data.images?.[0] || '',
          images: data.images || [],
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          source: 'used_gear',
        };
      }) as StoreItem[];
      setItems([...salesItems, ...usedGearItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setLoading(false);
    }, (error) => {
      console.error('Error loading used gear:', error);
    });

    return () => {
      unsubscribeSales();
      unsubscribeUsedGear();
    };
  }, []);

  const handleOpenForm = (item?: StoreItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description,
        category: item.category,
        itemType: item.itemType || 'equipment',
        price: item.price.toString(),
        condition: item.condition,
        location: item.location,
        sellerName: item.sellerName,
        sellerPhone: item.sellerPhone,
        sellerFgId: item.sellerFgId || '',
        imageUrl: item.imageUrl || '',
        status: item.status,
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        itemType: 'equipment',
        price: '',
        condition: 'Good',
        location: '',
        sellerName: '',
        sellerPhone: '',
        sellerFgId: '',
        imageUrl: '',
        status: 'pending',
      });
    }
    setShowForm(true);
  };

  const handleSaveItem = async () => {
    if (!formData.title || !formData.category || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        itemType: formData.itemType,
        price: parseFloat(formData.price) || 0,
        condition: formData.condition,
        location: formData.location,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone,
        sellerFgId: formData.sellerFgId || null,
        imageUrl: formData.imageUrl || null,
        status: formData.status,
        updatedAt: Timestamp.now(),
      };

      if (editingItem) {
        await updateDoc(doc(db, 'sales_items', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'sales_items'), {
          ...itemData,
          sellerId: user?.uid || 'admin',
          createdAt: Timestamp.now(),
        });
      }

      setShowForm(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(`Failed to save item: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: ItemStatus, reason?: string, source?: 'sales_items' | 'used_gear') => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      
      if (newStatus === 'approved') {
        updateData.approvedAt = Timestamp.now();
        updateData.approvedBy = user?.uid || 'admin';
      }
      
      if (newStatus === 'rejected' && reason) {
        updateData.rejectionReason = reason;
      }

      // Determine which collection to update
      const collectionName = source || 'sales_items';
      await updateDoc(doc(db, collectionName, itemId), updateData);
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDeleteItem = async (itemId: string, source?: 'sales_items' | 'used_gear') => {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
    try {
      const collectionName = source || 'sales_items';
      await deleteDoc(doc(db, collectionName, itemId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.sellerName?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = activeTab === 'all' || item.itemType === activeTab;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    equipment: items.filter(i => i.itemType === 'equipment').length,
    nonEquipment: items.filter(i => i.itemType === 'non-equipment').length,
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Catalogue</h1>
          <p className="text-gray-500">Manage sales items - equipment and non-equipment</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-xl font-bold">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Equipment</p>
              <p className="text-xl font-bold">{stats.equipment}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2">
              <Store className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Non-Equipment</p>
              <p className="text-xl font-bold">{stats.nonEquipment}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'all'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'equipment'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Camera className="mr-1 inline h-4 w-4" />
          Equipment ({stats.equipment})
        </button>
        <button
          onClick={() => setActiveTab('non-equipment')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'non-equipment'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="mr-1 inline h-4 w-4" />
          Non-Equipment ({stats.nonEquipment})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items, sellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-yellow-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'sold'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? status === 'all'
                    ? 'bg-yellow-100 text-yellow-700'
                    : statusColors[status]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type / Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.condition}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      item.itemType === 'equipment' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {item.itemType === 'equipment' ? 'Equipment' : 'Non-Equipment'}
                    </span>
                    <p className="mt-1 text-sm text-gray-600">{item.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{item.sellerName}</p>
                    <p className="text-xs text-gray-500">{item.sellerFgId || item.sellerId?.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-green-600">₹{item.price.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as ItemStatus;
                        if (newStatus === 'rejected') {
                          const reason = prompt('Rejection reason:');
                          if (reason) handleStatusChange(item.id, newStatus, reason, item.source);
                        } else {
                          handleStatusChange(item.id, newStatus, undefined, item.source);
                        }
                      }}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${statusColors[item.status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="sold">Sold</option>
                    </select>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === item.id ? null : item.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {showMenu === item.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border bg-white py-1 shadow-xl">
                          <button
                            onClick={() => {
                              handleOpenForm(item);
                              setShowMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" /> View Details
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.source)}
                            className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Item Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Item title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Item description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Type *</label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value as ItemType, category: '' })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="equipment">Equipment</option>
                    <option value="non-equipment">Non-Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {(formData.itemType === 'equipment' ? EQUIPMENT_CATEGORIES : NON_EQUIPMENT_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    {conditionOptions.map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="City, State"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller Name</label>
                  <input
                    type="text"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="Seller name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller Phone</label>
                  <input
                    type="text"
                    value={formData.sellerPhone}
                    onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="+91..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller FG_ID</label>
                  <input
                    type="text"
                    value={formData.sellerFgId}
                    onChange={(e) => setFormData({ ...formData, sellerFgId: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="FG_XXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saving}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
              <button onClick={() => setSelectedItem(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedItem.imageUrl && (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="h-48 w-full rounded-lg object-cover"
                />
              )}

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedItem.status]}`}>
                  {selectedItem.status.toUpperCase()}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                  selectedItem.itemType === 'equipment' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {selectedItem.itemType === 'equipment' ? 'Equipment' : 'Non-Equipment'}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold">{selectedItem.title}</h3>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-600">Price</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">₹{selectedItem.price.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-600">Condition</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{selectedItem.condition}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-500">Category</h4>
                <p className="font-medium">{selectedItem.category}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-500">Seller Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{selectedItem.sellerName}</span>
                  </div>
                  {selectedItem.sellerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedItem.sellerPhone}</span>
                    </div>
                  )}
                  {selectedItem.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{selectedItem.location}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    FG_ID: {selectedItem.sellerFgId || 'N/A'} | User ID: {selectedItem.sellerId}
                  </p>
                </div>
              </div>

              {selectedItem.rejectionReason && (
                <div className="rounded-lg bg-red-50 p-4">
                  <h4 className="text-sm font-medium text-red-600">Rejection Reason</h4>
                  <p className="text-red-700">{selectedItem.rejectionReason}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Created: {format(selectedItem.createdAt, 'MMM d, yyyy h:mm a')}
                {selectedItem.approvedAt && (
                  <> | Approved: {format(selectedItem.approvedAt, 'MMM d, yyyy h:mm a')}</>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleOpenForm(selectedItem);
                  setSelectedItem(null);
                }}
                className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-200"
              >
                Edit Item
              </button>
              <button
                onClick={() => setSelectedItem(null)}
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
