'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  MapPin,
  Building,
  Camera,
  Star,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  IndianRupee,
  Clock,
  Image,
  Plus,
  Edit,
  Trash2,
  Save,
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LeaseLocation {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  locationType: string;
  address: string;
  city: string;
  state: string;
  amenities: string[];
  pricePerDay: number;
  pricePerHour?: number;
  images: string[];
  rating: number;
  totalRatings: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LeaseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LeaseLocation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LeaseLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const pageSize = 15;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationType: 'studio',
    address: '',
    city: '',
    state: '',
    amenities: '',
    pricePerDay: '',
    pricePerHour: '',
    images: '',
    ownerName: 'Admin',
  });

  useEffect(() => {
    const q = query(collection(db, 'lease_locations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as LeaseLocation[];
      setLocations(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleVerified = async (location: LeaseLocation) => {
    try {
      await updateDoc(doc(db, 'lease_locations', location.id), {
        isVerified: !location.isVerified,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling verification:', error);
    }
  };

  const handleToggleActive = async (location: LeaseLocation) => {
    try {
      await updateDoc(doc(db, 'lease_locations', location.id), {
        isActive: !location.isActive,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await deleteDoc(doc(db, 'lease_locations', locationId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const handleOpenForm = (location?: LeaseLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        title: location.title,
        description: location.description,
        locationType: location.locationType,
        address: location.address,
        city: location.city,
        state: location.state,
        amenities: location.amenities?.join(', ') || '',
        pricePerDay: location.pricePerDay?.toString() || '',
        pricePerHour: location.pricePerHour?.toString() || '',
        images: location.images?.join('\n') || '',
        ownerName: location.ownerName || 'Admin',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        title: '',
        description: '',
        locationType: 'studio',
        address: '',
        city: '',
        state: '',
        amenities: '',
        pricePerDay: '',
        pricePerHour: '',
        images: '',
        ownerName: 'Admin',
      });
    }
    setShowForm(true);
  };

  const handleSaveLocation = async () => {
    if (!formData.title || !formData.city || !formData.pricePerDay) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const locationData = {
        title: formData.title,
        description: formData.description,
        locationType: formData.locationType,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
        pricePerDay: parseFloat(formData.pricePerDay),
        pricePerHour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : null,
        images: formData.images.split('\n').map(i => i.trim()).filter(Boolean),
        ownerName: formData.ownerName,
        ownerId: 'admin',
        rating: 0,
        totalRatings: 0,
        isVerified: true,
        isActive: true,
        updatedAt: Timestamp.now(),
      };

      if (editingLocation) {
        await updateDoc(doc(db, 'lease_locations', editingLocation.id), locationData);
      } else {
        await addDoc(collection(db, 'lease_locations'), {
          ...locationData,
          createdAt: Timestamp.now(),
        });
      }

      setShowForm(false);
      setEditingLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'studio':
        return <Camera className="h-4 w-4 text-purple-500" />;
      case 'outdoor':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'office':
        return <Building className="h-4 w-4 text-blue-500" />;
      default:
        return <Building className="h-4 w-4 text-gray-500" />;
    }
  };

  const locationTypes = ['all', ...new Set(locations.map((l) => l.locationType).filter(Boolean))];

  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.title?.toLowerCase().includes(search.toLowerCase()) ||
      location.city?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || location.locationType === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredLocations.length / pageSize);
  const paginatedData = filteredLocations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Lease Locations</h1>
        <p className="text-gray-600">Manage shooting locations and studios for rent</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Total Locations</p>
          <p className="text-2xl font-bold text-green-700">{locations.length}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Verified</p>
          <p className="text-2xl font-bold text-blue-700">
            {locations.filter((l) => l.isVerified).length}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Active</p>
          <p className="text-2xl font-bold text-purple-700">
            {locations.filter((l) => l.isActive).length}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Pending Verification</p>
          <p className="text-2xl font-bold text-orange-700">
            {locations.filter((l) => !l.isVerified).length}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add New Location
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        >
          {locationTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price/Day
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Rating
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
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No locations found
                </td>
              </tr>
            ) : (
              paginatedData.map((location) => (
                <tr
                  key={location.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedLocation(location)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                        {location.images?.[0] ? (
                          <img
                            src={location.images[0]}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <Image className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{location.title}</p>
                        <p className="text-xs text-gray-500">{location.ownerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                      {getLocationTypeIcon(location.locationType)}
                      {location.locationType || 'General'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {location.city}, {location.state}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 font-medium text-green-600">
                      <IndianRupee className="h-4 w-4" />
                      {location.pricePerDay?.toLocaleString() || 'N/A'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{(location.rating || 0).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          location.isVerified
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {location.isVerified ? '✓ Verified' : 'Pending'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          location.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === location.id ? null : location.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {showMenu === location.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                          <button
                            onClick={() => {
                              handleOpenForm(location);
                              setShowMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4 text-blue-500" /> Edit Location
                          </button>
                          <button
                            onClick={() => handleToggleVerified(location)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {location.isVerified ? (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" /> Remove Verification
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" /> Verify Location
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleActive(location)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {location.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(location.id)}
                            className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Location
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredLocations.length)} of{' '}
              {filteredLocations.length}
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
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
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
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  placeholder="e.g., Modern Film Studio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  placeholder="Describe the location..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Type</label>
                  <select
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  >
                    <option value="studio">Studio</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="office">Office</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="residential">Residential</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price per Day (₹) *</label>
                  <input
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price per Hour (₹)</label>
                  <input
                    type="number"
                    value={formData.pricePerHour}
                    onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  placeholder="WiFi, Parking, AC, Green Screen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Image URLs (one per line)</label>
                <textarea
                  value={formData.images}
                  onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-green-500 focus:outline-none"
                  placeholder="https://example.com/image1.jpg"
                />
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
                onClick={handleSaveLocation}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingLocation ? 'Update Location' : 'Create Location'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Location Details</h2>
              <button
                onClick={() => setSelectedLocation(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Images */}
            {selectedLocation.images?.length > 0 && (
              <div className="mb-6 grid grid-cols-3 gap-2">
                {selectedLocation.images.slice(0, 6).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className="h-32 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold">{selectedLocation.title}</h3>
              <p className="text-sm text-gray-500">by {selectedLocation.ownerName}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="text-gray-700">{selectedLocation.description || 'No description'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Address</h4>
                <p className="text-gray-700">
                  {selectedLocation.address}, {selectedLocation.city}, {selectedLocation.state}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Price/Day</p>
                  <p className="text-xl font-bold text-green-600">
                    ₹{selectedLocation.pricePerDay?.toLocaleString()}
                  </p>
                </div>
                {selectedLocation.pricePerHour && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Price/Hour</p>
                    <p className="text-xl font-bold text-blue-600">
                      ₹{selectedLocation.pricePerHour?.toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="flex items-center gap-1 text-xl font-bold">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {(selectedLocation.rating || 0).toFixed(1)}
                  </p>
                </div>
              </div>

              {selectedLocation.amenities?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Amenities</h4>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedLocation.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-500">Listed On</h4>
                <p className="text-gray-700">
                  {format(selectedLocation.createdAt, 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => handleToggleVerified(selectedLocation)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  selectedLocation.isVerified
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {selectedLocation.isVerified ? 'Remove Verification' : 'Verify Location'}
              </button>
              <button
                onClick={() => setSelectedLocation(null)}
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
