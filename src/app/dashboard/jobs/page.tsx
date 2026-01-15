'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Briefcase,
  MapPin,
  Clock,
  IndianRupee,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Users,
  Calendar,
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

interface Job {
  id: string;
  posterId: string;
  posterName: string;
  title: string;
  description: string;
  category: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  location: string;
  city: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryType: 'per-day' | 'per-month' | 'per-project';
  requirements: string[];
  skills: string[];
  experienceLevel: string;
  applicationDeadline?: Date;
  isActive: boolean;
  isVerified: boolean;
  isLiveJob: boolean;
  applicationsCount: number;
  createdAt: Date;
}

const JOB_CATEGORIES = [
  'Director',
  'Cinematographer',
  'Editor',
  'Sound Engineer',
  'Production Assistant',
  'Makeup Artist',
  'Costume Designer',
  'Set Designer',
  'Lighting Technician',
  'Camera Operator',
  'Gaffer',
  'Grip',
  'VFX Artist',
  'Colorist',
  'Script Writer',
  'Actor',
  'Stunt Coordinator',
  'Other',
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const pageSize = 15;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Camera Operator',
    jobType: 'freelance',
    location: '',
    city: '',
    isRemote: false,
    salaryMin: '',
    salaryMax: '',
    salaryType: 'per-day',
    requirements: '',
    skills: '',
    experienceLevel: 'entry',
    applicationDeadline: '',
    posterName: 'FilmGrid',
    isLiveJob: true,
    sendNotification: true,
  });

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        applicationDeadline: doc.data().applicationDeadline?.toDate(),
      })) as Job[];
      setJobs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleVerified = async (job: Job) => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        isVerified: !job.isVerified,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling verification:', error);
    }
  };

  const handleToggleActive = async (job: Job) => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        isActive: !job.isActive,
        updatedAt: Timestamp.now(),
      });
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleOpenForm = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        title: job.title,
        description: job.description,
        category: job.category,
        jobType: job.jobType,
        location: job.location,
        city: job.city,
        isRemote: job.isRemote,
        salaryMin: job.salaryMin?.toString() || '',
        salaryMax: job.salaryMax?.toString() || '',
        salaryType: job.salaryType,
        requirements: job.requirements?.join('\n') || '',
        skills: job.skills?.join(', ') || '',
        experienceLevel: job.experienceLevel,
        applicationDeadline: job.applicationDeadline
          ? format(job.applicationDeadline, 'yyyy-MM-dd')
          : '',
        posterName: job.posterName || 'FilmGrid',
        isLiveJob: job.isLiveJob ?? true,
        sendNotification: false,
      });
    } else {
      setEditingJob(null);
      setFormData({
        title: '',
        description: '',
        category: 'Camera Operator',
        jobType: 'freelance',
        location: '',
        city: '',
        isRemote: false,
        salaryMin: '',
        salaryMax: '',
        salaryType: 'per-day',
        requirements: '',
        skills: '',
        experienceLevel: 'entry',
        applicationDeadline: '',
        posterName: 'FilmGrid',
        isLiveJob: true,
        sendNotification: true,
      });
    }
    setShowForm(true);
  };

  const handleSaveJob = async () => {
    if (!formData.title || !formData.category || !formData.city) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        jobType: formData.jobType,
        location: formData.location,
        city: formData.city,
        isRemote: formData.isRemote,
        salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
        salaryType: formData.salaryType,
        requirements: formData.requirements.split('\n').map((r) => r.trim()).filter(Boolean),
        skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
        experienceLevel: formData.experienceLevel,
        applicationDeadline: formData.applicationDeadline
          ? Timestamp.fromDate(new Date(formData.applicationDeadline))
          : null,
        posterName: formData.posterName,
        posterId: 'admin',
        isVerified: true,
        isActive: true,
        isLiveJob: formData.isLiveJob,
        applicationsCount: 0,
        updatedAt: Timestamp.now(),
      };

      if (editingJob) {
        await updateDoc(doc(db, 'jobs', editingJob.id), jobData);
      } else {
        const docRef = await addDoc(collection(db, 'jobs'), {
          ...jobData,
          createdAt: Timestamp.now(),
        });

        // Send push notification for new live jobs
        if (formData.isLiveJob && formData.sendNotification) {
          try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const sendLiveJobNotification = httpsCallable(functions, 'sendLiveJobNotification');
            await sendLiveJobNotification({
              jobId: docRef.id,
              title: formData.title,
              category: formData.category,
              city: formData.city,
            });
          } catch (notifError) {
            console.error('Failed to send notification:', notifError);
            // Don't fail the job creation if notification fails
          }
        }
      }

      setShowForm(false);
      setEditingJob(null);
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['all', ...new Set(jobs.map((j) => j.category).filter(Boolean))];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.city?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const paginatedData = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Jobs Management</h1>
        <p className="text-gray-600">Manage film industry job postings</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Jobs</p>
          <p className="text-2xl font-bold text-blue-700">{jobs.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700">
            {jobs.filter((j) => j.isActive).length}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Verified</p>
          <p className="text-2xl font-bold text-purple-700">
            {jobs.filter((j) => j.isVerified).length}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Total Applications</p>
          <p className="text-2xl font-bold text-orange-700">
            {jobs.reduce((sum, j) => sum + (j.applicationsCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Post New Job
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
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
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Applications
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
                  No jobs found
                </td>
              </tr>
            ) : (
              paginatedData.map((job) => (
                <tr
                  key={job.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedJob(job)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-500">{job.posterName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                      {job.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {job.city}
                      {job.isRemote && (
                        <span className="ml-1 rounded bg-green-100 px-1 text-xs text-green-700">
                          Remote
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 font-medium text-green-600">
                      <IndianRupee className="h-4 w-4" />
                      {job.salaryMin?.toLocaleString()}
                      {job.salaryMax && ` - ${job.salaryMax.toLocaleString()}`}
                      <span className="text-xs text-gray-500">/{job.salaryType?.replace('per-', '')}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{job.applicationsCount || 0}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          job.isVerified
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {job.isVerified ? '✓ Verified' : 'Pending'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          job.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === job.id ? null : job.id)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {showMenu === job.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-xl">
                          <button
                            onClick={() => {
                              handleOpenForm(job);
                              setShowMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4 text-blue-500" /> Edit Job
                          </button>
                          <button
                            onClick={() => handleToggleVerified(job)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {job.isVerified ? (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" /> Remove Verification
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" /> Verify Job
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleActive(job)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {job.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Job
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
              {Math.min(currentPage * pageSize, filteredJobs.length)} of {filteredJobs.length}
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
                {editingJob ? 'Edit Job' : 'Post New Job'}
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
                <label className="block text-sm font-medium text-gray-700">Job Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Senior Cinematographer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Job description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Type</label>
                  <select
                    value={formData.jobType}
                    onChange={(e) => setFormData({ ...formData, jobType: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="freelance">Freelance</option>
                    <option value="contract">Contract</option>
                    <option value="part-time">Part-time</option>
                    <option value="full-time">Full-time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Details</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Film City, Goregaon"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRemote"
                  checked={formData.isRemote}
                  onChange={(e) => setFormData({ ...formData, isRemote: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isRemote" className="text-sm text-gray-700">
                  Remote work available
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary Type</label>
                  <select
                    value={formData.salaryType}
                    onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="per-day">Per Day</option>
                    <option value="per-month">Per Month</option>
                    <option value="per-project">Per Project</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Experience Level</label>
                <select
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level (2-5 years)</option>
                  <option value="senior">Senior (5+ years)</option>
                  <option value="expert">Expert (10+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requirements (one per line)
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Must have own equipment&#10;Available for night shoots&#10;Valid driving license"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="DaVinci Resolve, Adobe Premiere, Color Grading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Application Deadline</label>
                <input
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Live Job Settings */}
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
                <h3 className="mb-3 flex items-center gap-2 font-medium text-orange-700">
                  <Briefcase className="h-4 w-4" /> Live Job Notification
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isLiveJob"
                      checked={formData.isLiveJob}
                      onChange={(e) => setFormData({ ...formData, isLiveJob: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600"
                    />
                    <label htmlFor="isLiveJob" className="text-sm text-gray-700">
                      Mark as Live Job (Admin Posted)
                    </label>
                  </div>
                  {formData.isLiveJob && !editingJob && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sendNotification"
                        checked={formData.sendNotification}
                        onChange={(e) => setFormData({ ...formData, sendNotification: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600"
                      />
                      <label htmlFor="sendNotification" className="text-sm text-gray-700">
                        Send push notification to all users
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-orange-600">
                    Live jobs are highlighted in the app and users receive notifications about new opportunities.
                  </p>
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
                onClick={handleSaveJob}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingJob ? 'Update Job' : 'Post Job'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold">{selectedJob.title}</h3>
              <p className="text-sm text-gray-500">Posted by {selectedJob.posterName}</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                  {selectedJob.category}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {selectedJob.jobType}
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                  {selectedJob.experienceLevel}
                </span>
                {selectedJob.isRemote && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                    Remote
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="text-gray-700">{selectedJob.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">
                    {selectedJob.city}
                    {selectedJob.location && `, ${selectedJob.location}`}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Salary</p>
                  <p className="font-medium text-green-600">
                    ₹{selectedJob.salaryMin?.toLocaleString()}
                    {selectedJob.salaryMax && ` - ₹${selectedJob.salaryMax.toLocaleString()}`}
                    <span className="text-gray-500"> /{selectedJob.salaryType?.replace('per-', '')}</span>
                  </p>
                </div>
              </div>

              {selectedJob.requirements?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Requirements</h4>
                  <ul className="mt-1 list-inside list-disc text-gray-700">
                    {selectedJob.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedJob.skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Skills</h4>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Posted On</h4>
                  <p className="text-gray-700">{format(selectedJob.createdAt, 'MMM d, yyyy')}</p>
                </div>
                {selectedJob.applicationDeadline && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Application Deadline</h4>
                    <p className="text-gray-700">
                      {format(selectedJob.applicationDeadline, 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => handleToggleVerified(selectedJob)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  selectedJob.isVerified
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {selectedJob.isVerified ? 'Remove Verification' : 'Verify Job'}
              </button>
              <button
                onClick={() => setSelectedJob(null)}
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
