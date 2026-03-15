'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  Trophy,
  Plus,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Video,
  IndianRupee,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Award,
  Play,
  Pause,
  Save,
  Upload,
  Image as ImageIcon,
  Loader2,
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
  getDocs,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type CompetitionStatus = 'draft' | 'upcoming' | 'active' | 'closed' | 'cancelled';
type SubmissionStatus = 'pending' | 'submitted' | 'late' | 'disqualified' | 'winner';

interface Competition {
  id: string;
  title: string;
  description: string;
  rules: string;
  entryFee: number;
  prizePool: number;
  bannerUrl?: string;
  razorpayPlanId?: string;
  razorpayProductId?: string;
  // Phase-based timing
  registrationStart: Date;
  registrationEnd: Date;
  submissionStart: Date;
  submissionEnd: Date;
  judgingStart: Date;
  judgingEnd: Date;
  resultsDate: Date;
  // Legacy fields for backward compatibility
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  maxSubmissions: number;
  maxVideoDurationSec: number;
  maxFileSizeMB: number;
  status: CompetitionStatus;
  phase: string;
  createdBy: string;
  createdAt: Date;
  prizes?: Record<string, any>;
  categories?: string[];
}

interface Submission {
  id: string;
  competitionId: string;
  userId: string;
  userName: string;
  userFgId?: string;
  videoUrls: string[];
  status: SubmissionStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  disqualificationReason?: string;
}

const statusColors: Record<CompetitionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  upcoming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

const submissionStatusColors: Record<SubmissionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  late: 'bg-orange-100 text-orange-700',
  disqualified: 'bg-red-100 text-red-700',
  winner: 'bg-green-100 text-green-700',
};

export default function CompetitionsPage() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'competitions' | 'submissions'>('competitions');
  const [statusFilter, setStatusFilter] = useState<CompetitionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Competition | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 10;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rules: '',
    entryFee: '0',
    prizePool: '10000',
    bannerUrl: '',
    razorpayPlanId: '',
    razorpayProductId: '',
    // Phase-based timing
    registrationStart: '',
    registrationEnd: '',
    submissionStart: '',
    submissionEnd: '',
    judgingStart: '',
    judgingEnd: '',
    resultsDate: '',
    // Legacy fields
    startTime: '',
    endTime: '',
    maxParticipants: '100',
    maxSubmissions: '1',
    maxVideoDurationSec: '60',
    maxFileSizeMB: '100',
    status: 'draft' as CompetitionStatus,
    firstPrize: '',
    secondPrize: '',
    thirdPrize: '',
    categories: '',
  });

  useEffect(() => {
    const competitionsQuery = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
    const unsubCompetitions = onSnapshot(competitionsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          // Phase-based timing
          registrationStart: d.registrationStart?.toDate() || d.startTime?.toDate() || new Date(),
          registrationEnd: d.registrationEnd?.toDate() || d.startTime?.toDate() || new Date(),
          submissionStart: d.submissionStart?.toDate() || d.startTime?.toDate() || new Date(),
          submissionEnd: d.submissionEnd?.toDate() || d.endTime?.toDate() || new Date(),
          judgingStart: d.judgingStart?.toDate() || d.endTime?.toDate() || new Date(),
          judgingEnd: d.judgingEnd?.toDate() || d.endTime?.toDate() || new Date(),
          resultsDate: d.resultsDate?.toDate() || d.endTime?.toDate() || new Date(),
          // Legacy fields
          startTime: d.startTime?.toDate() || d.registrationStart?.toDate() || new Date(),
          endTime: d.endTime?.toDate() || d.submissionEnd?.toDate() || new Date(),
          createdAt: d.createdAt?.toDate() || new Date(),
          prizePool: d.prizePool || 0,
          maxParticipants: d.maxParticipants || 100,
          maxVideoDurationSec: d.maxVideoDurationSec || 60,
          maxFileSizeMB: d.maxFileSizeMB || 100,
          phase: d.phase || 'registration',
        };
      }) as Competition[];
      setCompetitions(data);
      setLoading(false);
    });

    const submissionsQuery = query(collection(db, 'competition_submissions'), orderBy('submittedAt', 'desc'));
    const unsubSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate(),
      })) as Submission[];
      setSubmissions(data);
    });

    return () => {
      unsubCompetitions();
      unsubSubmissions();
    };
  }, []);

  const handleOpenForm = (competition?: Competition) => {
    if (competition) {
      setEditingCompetition(competition);
      setFormData({
        title: competition.title,
        description: competition.description,
        rules: competition.rules,
        entryFee: competition.entryFee.toString(),
        prizePool: competition.prizePool?.toString() || '10000',
        bannerUrl: competition.bannerUrl || '',
        razorpayPlanId: competition.razorpayPlanId || '',
        razorpayProductId: competition.razorpayProductId || '',
        // Phase-based timing
        registrationStart: format(competition.registrationStart, "yyyy-MM-dd'T'HH:mm"),
        registrationEnd: format(competition.registrationEnd, "yyyy-MM-dd'T'HH:mm"),
        submissionStart: format(competition.submissionStart, "yyyy-MM-dd'T'HH:mm"),
        submissionEnd: format(competition.submissionEnd, "yyyy-MM-dd'T'HH:mm"),
        judgingStart: format(competition.judgingStart, "yyyy-MM-dd'T'HH:mm"),
        judgingEnd: format(competition.judgingEnd, "yyyy-MM-dd'T'HH:mm"),
        resultsDate: format(competition.resultsDate, "yyyy-MM-dd'T'HH:mm"),
        // Legacy fields
        startTime: format(competition.startTime, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(competition.endTime, "yyyy-MM-dd'T'HH:mm"),
        maxParticipants: competition.maxParticipants?.toString() || '100',
        maxSubmissions: competition.maxSubmissions?.toString() || '1',
        maxVideoDurationSec: competition.maxVideoDurationSec?.toString() || '60',
        maxFileSizeMB: competition.maxFileSizeMB?.toString() || '100',
        status: competition.status,
        firstPrize: competition.prizes?.first?.toString() || '',
        secondPrize: competition.prizes?.second?.toString() || '',
        thirdPrize: competition.prizes?.third?.toString() || '',
        categories: competition.categories?.join(', ') || '',
      });
    } else {
      setEditingCompetition(null);
      setFormData({
        title: '',
        description: '',
        rules: '',
        entryFee: '0',
        prizePool: '10000',
        bannerUrl: '',
        razorpayPlanId: '',
        razorpayProductId: '',
        registrationStart: '',
        registrationEnd: '',
        submissionStart: '',
        submissionEnd: '',
        judgingStart: '',
        judgingEnd: '',
        resultsDate: '',
        startTime: '',
        endTime: '',
        maxParticipants: '100',
        maxSubmissions: '1',
        maxVideoDurationSec: '60',
        maxFileSizeMB: '100',
        status: 'draft',
        firstPrize: '',
        secondPrize: '',
        thirdPrize: '',
        categories: '',
      });
    }
    setShowForm(true);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingBanner(true);
    try {
      const fileName = `competition_banners/${Date.now()}_${file.name}`;
      if (!storage) {
        console.error('Firebase storage not initialized');
        setUploadingBanner(false);
        return;
      }
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setFormData({ ...formData, bannerUrl: downloadUrl });
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Failed to upload banner image');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveCompetition = async () => {
    if (!formData.title || !formData.registrationStart || !formData.registrationEnd || !formData.submissionEnd) {
      alert('Please fill in all required fields (Title, Registration Start/End, Submission End)');
      return;
    }

    setSaving(true);
    try {
      // Build prizes object from separate fields
      const prizes = {
        first: parseFloat(formData.firstPrize) || 0,
        second: parseFloat(formData.secondPrize) || 0,
        third: parseFloat(formData.thirdPrize) || 0,
      };

      // Use registration dates as primary, fall back to legacy fields
      const regStart = formData.registrationStart || formData.startTime;
      const regEnd = formData.registrationEnd || formData.startTime;
      const subStart = formData.submissionStart || formData.registrationEnd || formData.startTime;
      const subEnd = formData.submissionEnd || formData.endTime;
      const judgStart = formData.judgingStart || formData.submissionEnd || formData.endTime;
      const judgEnd = formData.judgingEnd || formData.submissionEnd || formData.endTime;
      const results = formData.resultsDate || formData.judgingEnd || formData.endTime;

      const competitionData = {
        title: formData.title,
        description: formData.description,
        rules: formData.rules,
        entryFee: parseFloat(formData.entryFee) || 0,
        prizePool: parseFloat(formData.prizePool) || 0,
        bannerUrl: formData.bannerUrl || null,
        razorpayPlanId: formData.razorpayPlanId || null,
        razorpayProductId: formData.razorpayProductId || null,
        // Phase-based timing
        registrationStart: Timestamp.fromDate(new Date(regStart)),
        registrationEnd: Timestamp.fromDate(new Date(regEnd)),
        submissionStart: Timestamp.fromDate(new Date(subStart)),
        submissionEnd: Timestamp.fromDate(new Date(subEnd)),
        judgingStart: Timestamp.fromDate(new Date(judgStart)),
        judgingEnd: Timestamp.fromDate(new Date(judgEnd)),
        resultsDate: Timestamp.fromDate(new Date(results)),
        // Legacy fields for backward compatibility
        startTime: Timestamp.fromDate(new Date(regStart)),
        endTime: Timestamp.fromDate(new Date(subEnd)),
        maxParticipants: parseInt(formData.maxParticipants) || 100,
        maxSubmissions: parseInt(formData.maxSubmissions) || 1,
        maxVideoDurationSec: parseInt(formData.maxVideoDurationSec) || 60,
        maxFileSizeMB: parseInt(formData.maxFileSizeMB) || 100,
        status: formData.status,
        phase: 'registration',
        prizes,
        categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
        updatedAt: Timestamp.now(),
      };

      if (editingCompetition) {
        await updateDoc(doc(db, 'competitions', editingCompetition.id), competitionData);
      } else {
        await addDoc(collection(db, 'competitions'), {
          ...competitionData,
          createdBy: user?.uid || 'admin',
          createdAt: Timestamp.now(),
        });
      }

      setShowForm(false);
      setEditingCompetition(null);
    } catch (error: any) {
      console.error('Error saving competition:', error);
      alert(`Failed to save competition: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (competitionId: string, newStatus: CompetitionStatus) => {
    try {
      await updateDoc(doc(db, 'competitions', competitionId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteCompetition = async (competitionId: string) => {
    if (!confirm('Are you sure you want to delete this competition? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'competitions', competitionId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting competition:', error);
    }
  };

  const handleSubmissionStatus = async (submissionId: string, newStatus: SubmissionStatus, reason?: string) => {
    try {
      // Find the submission to get required fields for Firestore rules
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) {
        console.error('Submission not found');
        return;
      }

      const updateData: any = {
        status: newStatus,
        reviewedAt: Timestamp.now(),
        reviewedBy: user?.uid || 'admin',
        // Required fields that must be preserved per Firestore rules
        userId: submission.userId,
        competitionId: submission.competitionId,
        videoUrls: submission.videoUrls,
      };
      if (reason) {
        updateData.disqualificationReason = reason;
      }
      await updateDoc(doc(db, 'competition_submissions', submissionId), updateData);
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission status. Please try again.');
    }
  };

  const getSubmissionCount = (competitionId: string) => {
    return submissions.filter(s => s.competitionId === competitionId).length;
  };

  // Filter competitions
  const filteredCompetitions = competitions.filter((comp) => {
    const matchesSearch = comp.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || comp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCompetitions.length / pageSize);
  const paginatedCompetitions = filteredCompetitions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const stats = {
    total: competitions.length,
    active: competitions.filter(c => c.status === 'active').length,
    upcoming: competitions.filter(c => c.status === 'upcoming').length,
    closed: competitions.filter(c => c.status === 'closed').length,
    totalSubmissions: submissions.length,
    pendingReview: submissions.filter(s => s.status === 'submitted').length,
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Competition Management</h1>
        <p className="text-gray-600">Create and manage video competitions</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-6 gap-4">
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Total Competitions</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Upcoming</p>
          <p className="text-2xl font-bold text-blue-700">{stats.upcoming}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Closed</p>
          <p className="text-2xl font-bold text-purple-700">{stats.closed}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Total Submissions</p>
          <p className="text-2xl font-bold text-orange-700">{stats.totalSubmissions}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">Pending Review</p>
          <p className="text-2xl font-bold text-red-700">{stats.pendingReview}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('competitions')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'competitions'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Competitions ({competitions.length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'submissions'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Video className="h-4 w-4" />
            Submissions ({submissions.length})
          </button>
        </div>

        {activeTab === 'competitions' && (
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            <Plus className="h-4 w-4" />
            Create Competition
          </button>
        )}
      </div>

      {/* Competitions Tab */}
      {activeTab === 'competitions' && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search competitions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'draft', 'upcoming', 'active', 'closed', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
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
                    Competition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Entry Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Submissions
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
                {paginatedCompetitions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No competitions found
                    </td>
                  </tr>
                ) : (
                  paginatedCompetitions.map((comp) => (
                    <tr
                      key={comp.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedCompetition(comp)}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                            <Trophy className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{comp.title}</p>
                            <p className="text-xs text-gray-500">{comp.categories?.join(', ') || 'No categories'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-1 font-medium text-green-600">
                          <IndianRupee className="h-4 w-4" />
                          {comp.entryFee > 0 ? comp.entryFee.toLocaleString() : 'Free'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{format(comp.startTime, 'MMM d')} - {format(comp.endTime, 'MMM d')}</p>
                          <p className="text-xs text-gray-500">{format(comp.endTime, 'yyyy')}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{getSubmissionCount(comp.id)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[comp.status]}`}>
                          {comp.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setShowMenu(showMenu === comp.id ? null : comp.id)}
                            className="rounded p-1 hover:bg-gray-100"
                          >
                            <MoreVertical className="h-5 w-5 text-gray-500" />
                          </button>
                          {showMenu === comp.id && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border bg-white py-1 shadow-xl">
                              <button
                                onClick={() => {
                                  handleOpenForm(comp);
                                  setShowMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                <Edit className="h-4 w-4" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setViewingSubmissionsFor(comp);
                                  setShowMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                <Users className="h-4 w-4" /> View Submissions ({getSubmissionCount(comp.id)})
                              </button>
                              <p className="border-t px-4 py-2 text-xs font-medium text-gray-500">Change Status</p>
                              <div className="max-h-48 overflow-y-auto">
                                {(['draft', 'upcoming', 'active', 'closed', 'cancelled'] as CompetitionStatus[]).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(comp.id, status)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                      comp.status === status ? 'bg-yellow-50 text-yellow-600' : ''
                                    }`}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => handleDeleteCompetition(comp.id)}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredCompetitions.length)} of {filteredCompetitions.length}
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
        </>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="rounded-lg border bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Competition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Videos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Submitted
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
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const comp = competitions.find(c => c.id === sub.competitionId);
                  return (
                    <tr
                      key={sub.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="font-medium text-gray-900">{sub.userName}</p>
                        <p className="text-xs text-gray-500">{sub.userId.slice(0, 8)}...</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="text-gray-900">{comp?.title || 'Unknown'}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4 text-gray-400" />
                          <span>{sub.videoUrls?.length || 0} clips</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="text-sm text-gray-600">{format(sub.submittedAt, 'MMM d, yyyy h:mm a')}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={sub.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as SubmissionStatus;
                            if (newStatus === 'disqualified') {
                              const reason = prompt('Disqualification reason:');
                              if (reason) handleSubmissionStatus(sub.id, newStatus, reason);
                            } else {
                              handleSubmissionStatus(sub.id, newStatus);
                            }
                          }}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${submissionStatusColors[sub.status]}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="submitted">Submitted</option>
                          <option value="winner">Winner</option>
                          <option value="disqualified">Disqualified</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-600 hover:bg-blue-200"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Competition Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCompetition ? 'Edit Competition' : 'Create Competition'}
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
                  placeholder="Competition title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Competition description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rules</label>
                <textarea
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Competition rules and guidelines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Banner Image</label>
                <input
                  type="file"
                  ref={bannerInputRef}
                  onChange={handleBannerUpload}
                  accept="image/*"
                  className="hidden"
                />
                {formData.bannerUrl ? (
                  <div className="mt-2 relative">
                    <img
                      src={formData.bannerUrl}
                      alt="Banner preview"
                      className="h-40 w-full rounded-lg object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="rounded-full bg-white/90 p-2 shadow hover:bg-white"
                        title="Change image"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, bannerUrl: '' })}
                        className="rounded-full bg-white/90 p-2 shadow hover:bg-white"
                        title="Remove image"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-gray-500 hover:border-yellow-500 hover:text-yellow-600 disabled:opacity-50"
                  >
                    {uploadingBanner ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6" />
                        <span>Click to upload banner image</span>
                      </>
                    )}
                  </button>
                )}
                <p className="mt-1 text-xs text-gray-500">Recommended size: 1200x400px. Max 5MB. This will be displayed as the competition header.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entry Fee (₹)</label>
                  <select
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="0">Free</option>
                    <option value="50">₹50 - Basic</option>
                    <option value="75">₹75 - Standard</option>
                    <option value="99">₹99 - Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prize Pool (₹)</label>
                  <input
                    type="number"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Submissions per User</label>
                  <input
                    type="number"
                    value={formData.maxSubmissions}
                    onChange={(e) => setFormData({ ...formData, maxSubmissions: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Info */}
              {parseFloat(formData.entryFee) > 0 && (
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                  <h3 className="mb-2 flex items-center gap-2 font-medium text-green-700">
                    <IndianRupee className="h-4 w-4" /> Payment Configuration
                  </h3>
                  <p className="text-sm text-green-600">
                    ✓ Payment links will be automatically generated via Razorpay when users register.
                    Entry fee: <strong>₹{formData.entryFee}</strong>
                  </p>
                </div>
              )}

              {/* Schedule Section */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-blue-700">
                  <Calendar className="h-4 w-4" /> Competition Schedule
                </h3>
                
                {/* Registration Phase */}
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">📝 Registration Phase</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600">Registration Start *</label>
                      <input
                        type="datetime-local"
                        value={formData.registrationStart}
                        onChange={(e) => setFormData({ ...formData, registrationStart: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Registration End *</label>
                      <input
                        type="datetime-local"
                        value={formData.registrationEnd}
                        onChange={(e) => setFormData({ ...formData, registrationEnd: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submission Phase */}
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">🎬 Submission Phase</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600">Submission Start</label>
                      <input
                        type="datetime-local"
                        value={formData.submissionStart}
                        onChange={(e) => setFormData({ ...formData, submissionStart: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Submission End *</label>
                      <input
                        type="datetime-local"
                        value={formData.submissionEnd}
                        onChange={(e) => setFormData({ ...formData, submissionEnd: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Judging Phase */}
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">⚖️ Judging Phase</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600">Judging Start</label>
                      <input
                        type="datetime-local"
                        value={formData.judgingStart}
                        onChange={(e) => setFormData({ ...formData, judgingStart: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Judging End</label>
                      <input
                        type="datetime-local"
                        value={formData.judgingEnd}
                        onChange={(e) => setFormData({ ...formData, judgingEnd: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">🏆 Results</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600">Results Announcement Date</label>
                      <input
                        type="datetime-local"
                        value={formData.resultsDate}
                        onChange={(e) => setFormData({ ...formData, resultsDate: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Requirements */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-gray-700">
                  <Video className="h-4 w-4" /> Video Requirements
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600">Max Participants</label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Max Duration (seconds)</label>
                    <input
                      type="number"
                      value={formData.maxVideoDurationSec}
                      onChange={(e) => setFormData({ ...formData, maxVideoDurationSec: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Max File Size (MB)</label>
                    <input
                      type="number"
                      value={formData.maxFileSizeMB}
                      onChange={(e) => setFormData({ ...formData, maxFileSizeMB: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CompetitionStatus })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Categories (comma-separated)</label>
                <input
                  type="text"
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Short Film, Documentary, Music Video"
                />
              </div>

              {/* Prize Distribution */}
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-yellow-700">
                  <Award className="h-4 w-4" /> Prize Distribution (₹)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600">🥇 1st Prize</label>
                    <input
                      type="number"
                      value={formData.firstPrize}
                      onChange={(e) => setFormData({ ...formData, firstPrize: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">🥈 2nd Prize</label>
                    <input
                      type="number"
                      value={formData.secondPrize}
                      onChange={(e) => setFormData({ ...formData, secondPrize: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">🥉 3rd Prize</label>
                    <input
                      type="number"
                      value={formData.thirdPrize}
                      onChange={(e) => setFormData({ ...formData, thirdPrize: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                      placeholder="2500"
                    />
                  </div>
                </div>
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
                onClick={handleSaveCompetition}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingCompetition ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competition Detail Modal */}
      {selectedCompetition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Competition Details</h2>
              <button onClick={() => setSelectedCompetition(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-yellow-100">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedCompetition.title}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[selectedCompetition.status]}`}>
                  {selectedCompetition.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="text-gray-700">{selectedCompetition.description || 'No description'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Rules</h4>
                <p className="whitespace-pre-wrap text-gray-700">{selectedCompetition.rules || 'No rules specified'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <h4 className="text-sm font-medium text-green-600">Entry Fee</h4>
                  <p className="text-xl font-bold text-green-700">
                    {selectedCompetition.entryFee > 0 ? `₹${selectedCompetition.entryFee.toLocaleString()}` : 'Free'}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="text-sm font-medium text-blue-600">Submissions</h4>
                  <p className="text-xl font-bold text-blue-700">{getSubmissionCount(selectedCompetition.id)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-gray-600">Duration</h4>
                <p className="font-medium">
                  {format(selectedCompetition.startTime, 'MMM d, yyyy h:mm a')} - {format(selectedCompetition.endTime, 'MMM d, yyyy h:mm a')}
                </p>
              </div>

              {selectedCompetition.prizes && (
                <div className="rounded-lg bg-yellow-50 p-4">
                  <h4 className="text-sm font-medium text-yellow-600">Prizes</h4>
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <span className="text-2xl">🥇</span>
                      <p className="text-lg font-bold text-yellow-700">₹{selectedCompetition.prizes.first?.toLocaleString() || 0}</p>
                      <p className="text-xs text-yellow-600">1st Prize</p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl">🥈</span>
                      <p className="text-lg font-bold text-yellow-700">₹{selectedCompetition.prizes.second?.toLocaleString() || 0}</p>
                      <p className="text-xs text-yellow-600">2nd Prize</p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl">🥉</span>
                      <p className="text-lg font-bold text-yellow-700">₹{selectedCompetition.prizes.third?.toLocaleString() || 0}</p>
                      <p className="text-xs text-yellow-600">3rd Prize</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCompetition.categories && selectedCompetition.categories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Categories</h4>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedCompetition.categories.map((cat) => (
                      <span key={cat} className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Created: {format(selectedCompetition.createdAt, 'MMM d, yyyy h:mm a')}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleOpenForm(selectedCompetition);
                  setSelectedCompetition(null);
                }}
                className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-200"
              >
                Edit Competition
              </button>
              <button
                onClick={() => setSelectedCompetition(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {/* Competition Submissions List Modal */}
      {viewingSubmissionsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submissions for {viewingSubmissionsFor.title}</h2>
                <p className="text-sm text-gray-500">{getSubmissionCount(viewingSubmissionsFor.id)} total submissions</p>
              </div>
              <button onClick={() => setViewingSubmissionsFor(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      FG_ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Videos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.filter(s => s.competitionId === viewingSubmissionsFor.id).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No submissions yet for this competition
                      </td>
                    </tr>
                  ) : (
                    submissions
                      .filter(s => s.competitionId === viewingSubmissionsFor.id)
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <p className="font-medium text-gray-900">{sub.userName}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <p className="font-mono text-sm text-gray-600">{sub.userFgId || sub.userId.slice(0, 8)}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Video className="h-4 w-4 text-gray-400" />
                              <span>{sub.videoUrls?.length || 0} clips</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <p className="text-sm text-gray-600">{format(sub.submittedAt, 'MMM d, h:mm a')}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <select
                              value={sub.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as SubmissionStatus;
                                if (newStatus === 'disqualified') {
                                  const reason = prompt('Disqualification reason:');
                                  if (reason) handleSubmissionStatus(sub.id, newStatus, reason);
                                } else {
                                  handleSubmissionStatus(sub.id, newStatus);
                                }
                              }}
                              className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${submissionStatusColors[sub.status]}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="submitted">Submitted</option>
                              <option value="winner">Winner</option>
                              <option value="disqualified">Disqualified</option>
                            </select>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setViewingSubmissionsFor(null);
                              }}
                              className="rounded bg-blue-50 px-3 py-1 text-sm text-blue-600 hover:bg-blue-100"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewingSubmissionsFor(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Submission Details</h2>
              <button onClick={() => setSelectedSubmission(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${submissionStatusColors[selectedSubmission.status]}`}>
                  {selectedSubmission.status.toUpperCase()}
                </span>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-gray-600">Submitted By</h4>
                <p className="font-medium">{selectedSubmission.userName}</p>
                <p className="text-xs text-gray-500">FG_ID: {selectedSubmission.userFgId || 'N/A'}</p>
                <p className="text-xs text-gray-500">User ID: {selectedSubmission.userId}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Video Clips ({selectedSubmission.videoUrls?.length || 0})</h4>
                <div className="mt-2 space-y-2">
                  {selectedSubmission.videoUrls?.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-600 hover:bg-blue-100"
                    >
                      <Video className="h-4 w-4" />
                      Video {idx + 1}
                    </a>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Submitted: {format(selectedSubmission.submittedAt, 'MMM d, yyyy h:mm a')}
              </div>

              {selectedSubmission.disqualificationReason && (
                <div className="rounded-lg bg-red-50 p-4">
                  <h4 className="text-sm font-medium text-red-600">Disqualification Reason</h4>
                  <p className="text-red-700">{selectedSubmission.disqualificationReason}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {selectedSubmission.status === 'submitted' && (
                <>
                  <button
                    onClick={() => {
                      handleSubmissionStatus(selectedSubmission.id, 'winner');
                      setSelectedSubmission(null);
                    }}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Mark as Winner
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Disqualification reason:');
                      if (reason) {
                        handleSubmissionStatus(selectedSubmission.id, 'disqualified', reason);
                        setSelectedSubmission(null);
                      }
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Disqualify
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedSubmission(null)}
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
