'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Camera,
  Users,
  Settings,
  Save,
  Film,
  Loader2,
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface GearItem {
  equipmentId: string;
  name: string;
  brand: string;
  category: string;
  ownerId: string;
  ownerName: string;
  dailyRate: number;
  photoUrl?: string;
}

interface CrewMember {
  workerId: string;
  name: string;
  category: string;
  phone?: string;
  avatarUrl?: string;
  dailyRate?: number;
}

interface Project {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description?: string;
  startDate?: any;
  endDate?: any;
  gearItems: GearItem[];
  crewMembers: CrewMember[];
  status: string;
  createdAt: any;
  updatedAt?: any;
}

interface ProjectLimits {
  maxProjects: number;
  maxCameras: number;
  maxLenses: number;
  maxMisc: number;
  maxCrewCategories: number;
  crewPerCategory: number;
}

const DEFAULT_LIMITS: ProjectLimits = {
  maxProjects: 2,
  maxCameras: 2,
  maxLenses: 4,
  maxMisc: 8,
  maxCrewCategories: 5,
  crewPerCategory: 1,
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-orange-100 text-orange-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLimitsPanel, setShowLimitsPanel] = useState(false);
  const [limits, setLimits] = useState<ProjectLimits>(DEFAULT_LIMITS);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);

  // Load projects
  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        gearItems: d.data().gearItems || [],
        crewMembers: d.data().crewMembers || [],
      })) as Project[];
      setProjects(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load limits from Firestore
  useEffect(() => {
    setLimitsLoading(true);
    getDoc(doc(db, 'app_config', 'project_limits')).then((snap) => {
      if (snap.exists()) {
        setLimits({ ...DEFAULT_LIMITS, ...snap.data() } as ProjectLimits);
      }
      setLimitsLoading(false);
    }).catch(() => setLimitsLoading(false));
  }, []);

  const saveLimits = async () => {
    setLimitsSaving(true);
    try {
      await setDoc(doc(db, 'app_config', 'project_limits'), limits);
      alert('Limits saved successfully!');
    } catch (e) {
      alert('Failed to save limits');
    }
    setLimitsSaving(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (e) {
      alert('Failed to delete project');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} project(s)?`)) return;
    for (const id of selectedIds) {
      try { await deleteDoc(doc(db, 'projects', id)); } catch {}
    }
    setSelectedIds(new Set());
  };

  // Filter
  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.userName.toLowerCase().includes(search.toLowerCase()) ||
      p.userId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === 'draft').length,
    submitted: projects.filter((p) => p.status === 'submitted').length,
    active: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  };

  const uniqueUsers = new Set(projects.map((p) => p.userId)).size;

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total} projects from {uniqueUsers} users
          </p>
        </div>
        <button
          onClick={() => setShowLimitsPanel(!showLimitsPanel)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Settings className="h-4 w-4" />
          Project Limits
        </button>
      </div>

      {/* Limits Panel */}
      {showLimitsPanel && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-indigo-900">Project Limits Configuration</h3>
            <button
              onClick={saveLimits}
              disabled={limitsSaving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {limitsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Limits
            </button>
          </div>
          {limitsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {([
                { key: 'maxProjects', label: 'Max Projects/User' },
                { key: 'maxCameras', label: 'Max Cameras' },
                { key: 'maxLenses', label: 'Max Lenses' },
                { key: 'maxMisc', label: 'Max Misc Gear' },
                { key: 'maxCrewCategories', label: 'Max Crew Roles' },
                { key: 'crewPerCategory', label: 'Crew per Role' },
              ] as { key: keyof ProjectLimits; label: string }[]).map(({ key, label }) => (
                <div key={key} className="bg-white rounded-lg p-3 border border-indigo-100">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={limits[key]}
                    onChange={(e) => setLimits((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Draft', value: stats.draft, color: 'bg-gray-100 text-gray-600' },
          { label: 'Submitted', value: stats.submitted, color: 'bg-orange-100 text-orange-700' },
          { label: 'Active', value: stats.active, color: 'bg-green-100 text-green-700' },
          { label: 'Completed', value: stats.completed, color: 'bg-blue-100 text-blue-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project name, user name, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <span className="text-sm font-medium text-red-700">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-600 hover:underline">Clear</button>
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No projects found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(filtered.map((p) => p.id)));
                else setSelectedIds(new Set());
              }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <span className="text-xs text-gray-500">Select all ({filtered.length})</span>
          </div>

          {filtered.map((project) => {
            const isExpanded = expandedProject === project.id;
            const cameraCount = project.gearItems.filter((g) => g.category.toLowerCase() === 'camera').length;
            const lensCount = project.gearItems.filter((g) => g.category.toLowerCase() === 'lens').length;
            const miscCount = project.gearItems.length - cameraCount - lensCount;

            return (
              <div key={project.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Project Header */}
                <div className="flex items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(project.id)}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(project.id);
                      else next.delete(project.id);
                      setSelectedIds(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">{project.title}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-600'}`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        by <span className="font-medium">{project.userName}</span> · {formatDate(project.createdAt)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" />{project.gearItems.length} gear</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project.crewMembers.length} crew</span>
                  </div>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    {/* Project Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">User ID</span>
                        <p className="font-mono text-xs text-gray-700 truncate">{project.userId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Start Date</span>
                        <p className="font-medium text-gray-700">{formatDate(project.startDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">End Date</span>
                        <p className="font-medium text-gray-700">{formatDate(project.endDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Slots Used</span>
                        <p className="text-xs text-gray-700">{cameraCount} cam · {lensCount} lens · {miscCount} misc</p>
                      </div>
                    </div>

                    {/* Gear Items */}
                    {project.gearItems.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gear Items ({project.gearItems.length})</h4>
                        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="text-left px-3 py-2">Name</th>
                                <th className="text-left px-3 py-2">Brand</th>
                                <th className="text-left px-3 py-2">Category</th>
                                <th className="text-left px-3 py-2">Owner</th>
                                <th className="text-right px-3 py-2">Rate/Day</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {project.gearItems.map((g, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium text-gray-900">{g.name}</td>
                                  <td className="px-3 py-2 text-gray-600">{g.brand}</td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{g.category}</span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">{g.ownerName}</td>
                                  <td className="px-3 py-2 text-right font-medium text-green-700">₹{g.dailyRate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Crew Members */}
                    {project.crewMembers.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Crew Members ({project.crewMembers.length})</h4>
                        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="text-left px-3 py-2">Name</th>
                                <th className="text-left px-3 py-2">Role</th>
                                <th className="text-left px-3 py-2">Phone</th>
                                <th className="text-right px-3 py-2">Rate/Day</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {project.crewMembers.map((c, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">{c.category}</span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">{c.phone || '—'}</td>
                                  <td className="px-3 py-2 text-right font-medium text-green-700">{c.dailyRate ? `₹${c.dailyRate}` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {project.gearItems.length === 0 && project.crewMembers.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No items added to this project yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
