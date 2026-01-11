'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Video,
  Play,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Calendar,
  User,
  ExternalLink,
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

interface VideoPromotion {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  duration: number;
  views: number;
  status: 'pending' | 'approved' | 'rejected' | 'featured';
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

interface InfluencerPromotionRequest {
  id: string;
  userId: string;
  userName: string;
  influencerId: string;
  influencerName: string;
  campaignTitle: string;
  campaignDescription: string;
  contentType: string;
  deliverableCount: number;
  startDate: Date;
  endDate?: Date;
  durationDays: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  paymentAmount?: number;
  platformPreference?: string;
  createdAt: Date;
}

export default function PromotionsPage() {
  const [videoPromotions, setVideoPromotions] = useState<VideoPromotion[]>([]);
  const [influencerRequests, setInfluencerRequests] = useState<InfluencerPromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'influencer'>('videos');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VideoPromotion | InfluencerPromotionRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoPromotion | null>(null);
  const [saving, setSaving] = useState(false);
  const pageSize = 15;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    category: 'promotional',
    duration: '',
    userName: 'Admin',
  });

  useEffect(() => {
    // Video promotions
    const videoQuery = query(collection(db, 'video_promotions'), orderBy('createdAt', 'desc'));
    const unsubVideo = onSnapshot(videoQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
      })) as VideoPromotion[];
      setVideoPromotions(data);
    });

    // Influencer promotion requests
    const influencerQuery = query(collection(db, 'influencer_promotion_requests'), orderBy('createdAt', 'desc'));
    const unsubInfluencer = onSnapshot(influencerQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate(),
      })) as InfluencerPromotionRequest[];
      setInfluencerRequests(data);
      setLoading(false);
    });

    return () => {
      unsubVideo();
      unsubInfluencer();
    };
  }, []);

  const handleUpdateVideoStatus = async (video: VideoPromotion, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'video_promotions', video.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video promotion?')) return;
    try {
      await deleteDoc(doc(db, 'video_promotions', videoId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const handleOpenForm = (video?: VideoPromotion) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || '',
        category: video.category,
        duration: video.duration?.toString() || '',
        userName: video.userName || 'Admin',
      });
    } else {
      setEditingVideo(null);
      setFormData({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        category: 'promotional',
        duration: '',
        userName: 'Admin',
      });
    }
    setShowForm(true);
  };

  const extractYouTubeId = (url: string): string | null => {
    const regexes = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const regex of regexes) {
      const match = url.match(regex);
      if (match) return match[1];
    }
    return null;
  };

  const handleSaveVideo = async () => {
    if (!formData.title || !formData.videoUrl) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Auto-generate YouTube thumbnail if not provided
      let thumbnailUrl = formData.thumbnailUrl;
      if (!thumbnailUrl) {
        const youtubeId = extractYouTubeId(formData.videoUrl);
        if (youtubeId) {
          thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }
      }

      const videoData = {
        title: formData.title,
        description: formData.description,
        videoUrl: formData.videoUrl,
        thumbnailUrl: thumbnailUrl,
        category: formData.category,
        duration: parseInt(formData.duration) || 0,
        userName: formData.userName,
        userId: 'admin',
        views: 0,
        status: 'approved',
        isActive: true,
        updatedAt: Timestamp.now(),
      };

      if (editingVideo) {
        await updateDoc(doc(db, 'video_promotions', editingVideo.id), videoData);
      } else {
        await addDoc(collection(db, 'video_promotions'), {
          ...videoData,
          createdAt: Timestamp.now(),
        });
      }

      setShowForm(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Failed to save video promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInfluencerStatus = async (request: InfluencerPromotionRequest, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'influencer_promotion_requests', request.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      declined: 'bg-red-100 text-red-700',
      featured: 'bg-purple-100 text-purple-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter data based on active tab
  const filteredVideos = videoPromotions.filter((video) => {
    const matchesSearch = video.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRequests = influencerRequests.filter((request) => {
    const matchesSearch = 
      request.campaignTitle?.toLowerCase().includes(search.toLowerCase()) ||
      request.influencerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currentData = activeTab === 'videos' ? filteredVideos : filteredRequests;
  const totalPages = Math.ceil(currentData.length / pageSize);
  const paginatedData = currentData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Video Promotions</h1>
        <p className="text-gray-600">Manage video promotions and influencer campaigns</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Total Videos</p>
          <p className="text-2xl font-bold text-purple-700">{videoPromotions.length}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-700">
            {videoPromotions.filter((v) => v.status === 'pending').length}
          </p>
        </div>
        <div className="rounded-lg bg-pink-50 p-4">
          <p className="text-sm text-pink-600">Influencer Requests</p>
          <p className="text-2xl font-bold text-pink-700">{influencerRequests.length}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Active Campaigns</p>
          <p className="text-2xl font-bold text-blue-700">
            {influencerRequests.filter((r) => r.status === 'accepted').length}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      {activeTab === 'videos' && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Video Promotion
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setActiveTab('videos');
            setCurrentPage(1);
            setStatusFilter('all');
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'videos'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Video className="mr-2 inline h-4 w-4" />
          Video Promotions ({videoPromotions.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('influencer');
            setCurrentPage(1);
            setStatusFilter('all');
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'influencer'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <User className="mr-2 inline h-4 w-4" />
          Influencer Campaigns ({influencerRequests.length})
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'videos' ? 'Search videos...' : 'Search campaigns...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          {activeTab === 'videos' ? (
            <>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="featured">Featured</option>
            </>
          ) : (
            <>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </>
          )}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {activeTab === 'videos' ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Video
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Views
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
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No video promotions found
                  </td>
                </tr>
              ) : (
                (paginatedData as VideoPromotion[]).map((video) => (
                  <tr
                    key={video.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedItem(video)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-16 w-24 items-center justify-center rounded-lg bg-gray-100">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt=""
                              className="h-16 w-24 rounded-lg object-cover"
                            />
                          ) : (
                            <Video className="h-6 w-6 text-gray-400" />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-8 w-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{video.title}</p>
                          <p className="text-xs text-gray-500">{video.userName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                        {video.category || 'General'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        {formatDuration(video.duration || 0)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="h-4 w-4" />
                        {(video.views || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(video.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === video.id ? null : video.id)}
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        {showMenu === video.id && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                            <button
                              onClick={() => {
                                handleOpenForm(video);
                                setShowMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4 text-blue-500" /> Edit Video
                            </button>
                            <button
                              onClick={() => handleUpdateVideoStatus(video, 'approved')}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateVideoStatus(video, 'featured')}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50"
                            >
                              Feature Video
                            </button>
                            <button
                              onClick={() => handleUpdateVideoStatus(video, 'rejected')}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete
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
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Influencer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Content Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
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
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No influencer campaigns found
                  </td>
                </tr>
              ) : (
                (paginatedData as InfluencerPromotionRequest[]).map((request) => (
                  <tr
                    key={request.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedItem(request)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{request.campaignTitle}</p>
                        <p className="text-xs text-gray-500">by {request.userName}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-pink-600">{request.influencerName}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {request.contentType || 'General'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {request.durationDays} days
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === request.id ? null : request.id)}
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        {showMenu === request.id && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                            <button
                              onClick={() => handleUpdateInfluencerStatus(request, 'completed')}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" /> Mark Completed
                            </button>
                            <button
                              onClick={() => handleUpdateInfluencerStatus(request, 'cancelled')}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" /> Cancel
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, currentData.length)} of {currentData.length}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingVideo ? 'Edit Video Promotion' : 'Add Video Promotion'}
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
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., FilmGrid Platform Overview"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-purple-500 focus:outline-none"
                  placeholder="Describe the video..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Video URL *</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    const youtubeId = extractYouTubeId(url);
                    const autoThumbnail = youtubeId 
                      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` 
                      : '';
                    setFormData({ 
                      ...formData, 
                      videoUrl: url,
                      thumbnailUrl: autoThumbnail || formData.thumbnailUrl,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-purple-500 focus:outline-none"
                  placeholder="https://youtube.com/watch?v=..."
                />
                {formData.videoUrl && extractYouTubeId(formData.videoUrl) && (
                  <p className="mt-1 text-xs text-green-600">✓ YouTube thumbnail will be auto-extracted</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Thumbnail URL <span className="text-gray-400">(auto-filled for YouTube)</span>
                </label>
                <input
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 focus:border-purple-500 focus:outline-none"
                  placeholder="Auto-generated from YouTube URL"
                  readOnly={!!extractYouTubeId(formData.videoUrl)}
                />
                {formData.thumbnailUrl && (
                  <div className="mt-2">
                    <img 
                      src={formData.thumbnailUrl} 
                      alt="Thumbnail preview" 
                      className="h-20 w-36 rounded-lg object-cover border"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="promotional">Promotional</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="testimonial">Testimonial</option>
                    <option value="behind-the-scenes">Behind the Scenes</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-purple-500 focus:outline-none"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Creator Name</label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-purple-500 focus:outline-none"
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
                onClick={handleSaveVideo}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingVideo ? 'Update Video' : 'Create Video'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'videos' ? 'Video Details' : 'Campaign Details'}
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {'videoUrl' in selectedItem ? (
              // Video details
              <div className="space-y-4">
                {selectedItem.thumbnailUrl && (
                  <img
                    src={selectedItem.thumbnailUrl}
                    alt=""
                    className="h-48 w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                <p className="text-gray-600">{selectedItem.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-bold">{formatDuration(selectedItem.duration || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Views</p>
                    <p className="font-bold">{(selectedItem.views || 0).toLocaleString()}</p>
                  </div>
                </div>
                {selectedItem.videoUrl && (
                  <a
                    href={selectedItem.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" /> Watch Video
                  </a>
                )}
              </div>
            ) : (
              // Influencer campaign details
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{selectedItem.campaignTitle}</h3>
                <p className="text-gray-600">{selectedItem.campaignDescription}</p>
                <div className="rounded-lg bg-pink-50 p-3">
                  <p className="text-sm text-pink-600">Influencer</p>
                  <p className="font-bold text-pink-700">{selectedItem.influencerName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Content Type</p>
                    <p className="font-bold">{selectedItem.contentType}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Deliverables</p>
                    <p className="font-bold">{selectedItem.deliverableCount}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-bold">{selectedItem.durationDays} days</p>
                  </div>
                  {selectedItem.paymentAmount && (
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-sm text-green-600">Budget</p>
                      <p className="font-bold text-green-700">
                        ₹{selectedItem.paymentAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Campaign Period</p>
                  <p className="text-gray-700">
                    {format(selectedItem.startDate, 'MMM d, yyyy')}
                    {selectedItem.endDate && ` - ${format(selectedItem.endDate, 'MMM d, yyyy')}`}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
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
