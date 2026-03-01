'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Star,
  Users,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Award,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SocialMediaLink {
  platform: string;
  url: string;
  followers?: string;
}

interface InfluencerProfile {
  id: string;
  userId: string;
  name: string;
  bio: string;
  category: string;
  platforms: string[];
  socialMediaLinks: SocialMediaLink[];
  followersCount: number;
  rating: number;
  totalRatings: number;
  pricePerPost?: number;
  profileImageUrl?: string;
  portfolioUrl?: string;
  isAvailable: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: Date;
}

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerProfile | null>(null);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 15;

  useEffect(() => {
    // Load featured influencers list
    const loadFeatured = async () => {
      try {
        const featuredDoc = await getDoc(doc(db, 'app_config', 'featured_influencers'));
        if (featuredDoc.exists()) {
          const ids = featuredDoc.data().influencerIds || [];
          setFeaturedIds(new Set(ids));
        }
      } catch (error) {
        console.error('Error loading featured influencers:', error);
      }
    };
    loadFeatured();

    // Query users with verified influencer role
    const usersQuery = query(
      collection(db, 'users'),
      where('influencerVerification.status', '==', 'verified')
    );
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const socialLinks = (data.socialMediaLinks || []) as SocialMediaLink[];
        // Extract platforms from socialMediaLinks
        const platforms = socialLinks.map((link: SocialMediaLink) => link.platform);
        return {
          id: docSnap.id,
          userId: docSnap.id,
          name: data.displayName || data.name || 'Unknown',
          bio: data.bio || '',
          category: data.influencerCategory || 'General',
          platforms: platforms.length > 0 ? platforms : (data.platforms || []),
          socialMediaLinks: socialLinks,
          followersCount: data.followersCount || 0,
          rating: data.rating || 0,
          totalRatings: data.totalRatings || 0,
          pricePerPost: data.pricePerPost || data.promotionPricing,
          profileImageUrl: data.profileImageUrl || data.avatarUrl || data.photoURL,
          portfolioUrl: data.portfolioUrl,
          isAvailable: data.isAvailable !== false,
          isVerified: true,
          isFeatured: false,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as InfluencerProfile[];
      setInfluencers(usersData);
      setLoading(false);
    });

    return () => {
      unsubUsers();
    };
  }, []);

  const handleToggleVerified = async (influencer: InfluencerProfile) => {
    try {
      await updateDoc(doc(db, 'influencer_profiles', influencer.id), {
        isVerified: !influencer.isVerified,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling verification:', error);
    }
  };

  const handleToggleFeatured = async (influencer: InfluencerProfile) => {
    try {
      const isFeatured = featuredIds.has(influencer.id);
      const newFeaturedIds = new Set(featuredIds);
      
      if (isFeatured) {
        newFeaturedIds.delete(influencer.id);
      } else {
        if (newFeaturedIds.size >= 6) {
          alert('Maximum 6 featured influencers allowed. Remove one first.');
          return;
        }
        newFeaturedIds.add(influencer.id);
      }
      
      // Save to Firestore
      await setDoc(doc(db, 'app_config', 'featured_influencers'), {
        influencerIds: Array.from(newFeaturedIds),
        updatedAt: Timestamp.now(),
      });
      
      setFeaturedIds(newFeaturedIds);
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling featured status:', error);
    }
  };

  const handleToggleAvailable = async (influencer: InfluencerProfile) => {
    try {
      await updateDoc(doc(db, 'influencer_profiles', influencer.id), {
        isAvailable: !influencer.isAvailable,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleDelete = async (influencerId: string) => {
    if (!confirm('Are you sure you want to delete this influencer profile?')) return;
    try {
      await deleteDoc(doc(db, 'influencer_profiles', influencerId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting influencer:', error);
    }
  };

  const getPlatformIcon = (platform: string, hasLink: boolean = true) => {
    const colorClass = hasLink ? '' : 'opacity-30';
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className={`h-4 w-4 ${hasLink ? 'text-pink-500' : 'text-gray-400'} ${colorClass}`} />;
      case 'youtube':
        return <Youtube className={`h-4 w-4 ${hasLink ? 'text-red-500' : 'text-gray-400'} ${colorClass}`} />;
      case 'facebook':
        return <Facebook className={`h-4 w-4 ${hasLink ? 'text-blue-600' : 'text-gray-400'} ${colorClass}`} />;
      case 'twitter':
        return <Twitter className={`h-4 w-4 ${hasLink ? 'text-blue-400' : 'text-gray-400'} ${colorClass}`} />;
      default:
        return <TrendingUp className={`h-4 w-4 ${hasLink ? 'text-gray-500' : 'text-gray-400'} ${colorClass}`} />;
    }
  };

  // Helper to get social link URL by platform
  const getSocialLinkUrl = (links: SocialMediaLink[], platform: string): string | null => {
    const link = links.find(l => l.platform.toLowerCase() === platform.toLowerCase());
    return link?.url || null;
  };

  // Helper to check if influencer has a specific platform link
  const hasPlatformLink = (links: SocialMediaLink[], platform: string): boolean => {
    return links.some(l => l.platform.toLowerCase() === platform.toLowerCase() && l.url);
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const categories = ['all', ...new Set(influencers.map((i) => i.category).filter(Boolean))];

  const filteredInfluencers = influencers.filter((influencer) => {
    const matchesSearch = influencer.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || influencer.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredInfluencers.length / pageSize);
  const paginatedData = filteredInfluencers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Influencer Management</h1>
        <p className="text-gray-600">Manage influencer profiles and promotions</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="rounded-lg bg-pink-50 p-4">
          <p className="text-sm text-pink-600">Total Influencers</p>
          <p className="text-2xl font-bold text-pink-700">{influencers.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Verified</p>
          <p className="text-2xl font-bold text-green-700">
            {influencers.filter((i) => i.isVerified).length}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Available</p>
          <p className="text-2xl font-bold text-blue-700">
            {influencers.filter((i) => i.isAvailable).length}
          </p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Featured</p>
          <p className="text-2xl font-bold text-yellow-700">{featuredIds.size}/6</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Total Reach</p>
          <p className="text-2xl font-bold text-purple-700">
            {formatFollowers(influencers.reduce((sum, i) => sum + (i.followersCount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search influencers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-sm font-medium text-red-700">{selectedIds.size} influencer(s) selected</span>
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected influencer(s)?`)) return;
              for (const id of selectedIds) {
                await deleteDoc(doc(db, 'influencer_profiles', id));
              }
              setSelectedIds(new Set());
            }}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" /> Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-800">Clear Selection</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={paginatedData.length > 0 && paginatedData.every(i => selectedIds.has(i.id))}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) { paginatedData.forEach(i => newSet.add(i.id)); } else { paginatedData.forEach(i => newSet.delete(i.id)); }
                    setSelectedIds(newSet);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Influencer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Platforms
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Followers
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
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No influencers found
                </td>
              </tr>
            ) : (
              paginatedData.map((influencer) => (
                <tr
                  key={influencer.id}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedIds.has(influencer.id) ? 'bg-pink-50' : ''}`}
                  onClick={() => setSelectedInfluencer(influencer)}
                >
                  <td className="whitespace-nowrap px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(influencer.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedIds);
                        if (e.target.checked) { newSet.add(influencer.id); } else { newSet.delete(influencer.id); }
                        setSelectedIds(newSet);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
                        {influencer.profileImageUrl ? (
                          <img
                            src={influencer.profileImageUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-pink-600">
                            {influencer.name?.[0]?.toUpperCase() || 'I'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{influencer.name}</p>
                          {featuredIds.has(influencer.id) && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        {influencer.isVerified && (
                          <span className="text-xs text-blue-500">✓ Verified</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                      {influencer.category || 'General'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex gap-2">
                      {/* Always show Instagram, Facebook, YouTube - colored if link exists, dark if not */}
                      <a
                        href={getSocialLinkUrl(influencer.socialMediaLinks, 'instagram') || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => !hasPlatformLink(influencer.socialMediaLinks, 'instagram') && e.preventDefault()}
                        className={`transition-transform ${hasPlatformLink(influencer.socialMediaLinks, 'instagram') ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                        title={hasPlatformLink(influencer.socialMediaLinks, 'instagram') ? 'Open Instagram' : 'No Instagram link'}
                      >
                        {getPlatformIcon('instagram', hasPlatformLink(influencer.socialMediaLinks, 'instagram'))}
                      </a>
                      <a
                        href={getSocialLinkUrl(influencer.socialMediaLinks, 'facebook') || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => !hasPlatformLink(influencer.socialMediaLinks, 'facebook') && e.preventDefault()}
                        className={`transition-transform ${hasPlatformLink(influencer.socialMediaLinks, 'facebook') ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                        title={hasPlatformLink(influencer.socialMediaLinks, 'facebook') ? 'Open Facebook' : 'No Facebook link'}
                      >
                        {getPlatformIcon('facebook', hasPlatformLink(influencer.socialMediaLinks, 'facebook'))}
                      </a>
                      <a
                        href={getSocialLinkUrl(influencer.socialMediaLinks, 'youtube') || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => !hasPlatformLink(influencer.socialMediaLinks, 'youtube') && e.preventDefault()}
                        className={`transition-transform ${hasPlatformLink(influencer.socialMediaLinks, 'youtube') ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                        title={hasPlatformLink(influencer.socialMediaLinks, 'youtube') ? 'Open YouTube' : 'No YouTube link'}
                      >
                        {getPlatformIcon('youtube', hasPlatformLink(influencer.socialMediaLinks, 'youtube'))}
                      </a>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{formatFollowers(influencer.followersCount || 0)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{(influencer.rating || 0).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        influencer.isAvailable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {influencer.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === influencer.id ? null : influencer.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {showMenu === influencer.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                          <button
                            onClick={() => handleToggleVerified(influencer)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {influencer.isVerified ? (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" /> Remove Verification
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" /> Verify Influencer
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleAvailable(influencer)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {influencer.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                          </button>
                          <button
                            onClick={() => handleToggleFeatured(influencer)}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                              featuredIds.has(influencer.id)
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-yellow-600 hover:bg-yellow-50'
                            }`}
                          >
                            <Award className="h-4 w-4" />
                            {featuredIds.has(influencer.id) ? 'Remove from Featured' : 'Add to Featured'}
                          </button>
                          <button
                            onClick={() => handleDelete(influencer.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete Profile
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
              {Math.min(currentPage * pageSize, filteredInfluencers.length)} of{' '}
              {filteredInfluencers.length}
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

      {/* Detail Modal */}
      {selectedInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Influencer Details</h2>
              <button
                onClick={() => setSelectedInfluencer(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-100">
                {selectedInfluencer.profileImageUrl ? (
                  <img
                    src={selectedInfluencer.profileImageUrl}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-pink-600">
                    {selectedInfluencer.name?.[0]?.toUpperCase() || 'I'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedInfluencer.name}</h3>
                <p className="text-sm text-gray-500">{selectedInfluencer.category}</p>
                <div className="mt-1 flex items-center gap-2">
                  {selectedInfluencer.isVerified && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                      ✓ Verified
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selectedInfluencer.isAvailable
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {selectedInfluencer.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Bio</h4>
                <p className="text-gray-700">{selectedInfluencer.bio || 'No bio provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Followers</p>
                  <p className="text-xl font-bold">
                    {formatFollowers(selectedInfluencer.followersCount || 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="flex items-center gap-1 text-xl font-bold">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {(selectedInfluencer.rating || 0).toFixed(1)}
                    <span className="text-sm font-normal text-gray-400">
                      ({selectedInfluencer.totalRatings || 0})
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Social Media Links</h4>
                <div className="mt-2 flex gap-3">
                  {/* Instagram */}
                  <a
                    href={getSocialLinkUrl(selectedInfluencer.socialMediaLinks, 'instagram') || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => !hasPlatformLink(selectedInfluencer.socialMediaLinks, 'instagram') && e.preventDefault()}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                      hasPlatformLink(selectedInfluencer.socialMediaLinks, 'instagram')
                        ? 'bg-pink-50 text-pink-600 hover:bg-pink-100 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-default'
                    }`}
                  >
                    <Instagram className={`h-5 w-5 ${hasPlatformLink(selectedInfluencer.socialMediaLinks, 'instagram') ? 'text-pink-500' : 'text-gray-300'}`} />
                    Instagram
                    {hasPlatformLink(selectedInfluencer.socialMediaLinks, 'instagram') && <ExternalLink className="h-3 w-3" />}
                  </a>
                  {/* Facebook */}
                  <a
                    href={getSocialLinkUrl(selectedInfluencer.socialMediaLinks, 'facebook') || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => !hasPlatformLink(selectedInfluencer.socialMediaLinks, 'facebook') && e.preventDefault()}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                      hasPlatformLink(selectedInfluencer.socialMediaLinks, 'facebook')
                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-default'
                    }`}
                  >
                    <Facebook className={`h-5 w-5 ${hasPlatformLink(selectedInfluencer.socialMediaLinks, 'facebook') ? 'text-blue-600' : 'text-gray-300'}`} />
                    Facebook
                    {hasPlatformLink(selectedInfluencer.socialMediaLinks, 'facebook') && <ExternalLink className="h-3 w-3" />}
                  </a>
                  {/* YouTube */}
                  <a
                    href={getSocialLinkUrl(selectedInfluencer.socialMediaLinks, 'youtube') || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => !hasPlatformLink(selectedInfluencer.socialMediaLinks, 'youtube') && e.preventDefault()}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                      hasPlatformLink(selectedInfluencer.socialMediaLinks, 'youtube')
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-default'
                    }`}
                  >
                    <Youtube className={`h-5 w-5 ${hasPlatformLink(selectedInfluencer.socialMediaLinks, 'youtube') ? 'text-red-500' : 'text-gray-300'}`} />
                    YouTube
                    {hasPlatformLink(selectedInfluencer.socialMediaLinks, 'youtube') && <ExternalLink className="h-3 w-3" />}
                  </a>
                </div>
              </div>

              {selectedInfluencer.pricePerPost && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Price per Post</h4>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{selectedInfluencer.pricePerPost.toLocaleString()}
                  </p>
                </div>
              )}

              {selectedInfluencer.portfolioUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Portfolio</h4>
                  <a
                    href={selectedInfluencer.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Eye className="h-4 w-4" /> View Portfolio
                  </a>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-500">Joined</h4>
                <p className="text-gray-700">
                  {format(selectedInfluencer.createdAt, 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => handleToggleVerified(selectedInfluencer)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  selectedInfluencer.isVerified
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {selectedInfluencer.isVerified ? 'Remove Verification' : 'Verify Influencer'}
              </button>
              <button
                onClick={() => setSelectedInfluencer(null)}
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
