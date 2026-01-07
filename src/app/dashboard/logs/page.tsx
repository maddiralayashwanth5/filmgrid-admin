'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  History,
  User,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Mail,
  Clock,
  Filter,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AdminLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  targetUserId?: string;
  targetUserName?: string;
  collection?: string;
  requestId?: string;
  status?: string;
  reason?: string;
  notes?: string;
  recordCount?: number;
  filters?: Record<string, string>;
  timestamp: Date;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const q = query(
      collection(db, 'admin_logs'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as AdminLog[];
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'VERIFY_USER':
      case 'VERIFY_EQUIPMENT':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'BAN_USER':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'UNBAN_USER':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'FORCE_EXPIRE_REQUEST':
      case 'CANCEL_REQUEST':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'MARKETING_EXPORT':
        return <Download className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      VERIFY_USER: 'bg-green-100 text-green-700',
      VERIFY_EQUIPMENT: 'bg-green-100 text-green-700',
      BAN_USER: 'bg-red-100 text-red-700',
      UNBAN_USER: 'bg-blue-100 text-blue-700',
      FORCE_EXPIRE_REQUEST: 'bg-orange-100 text-orange-700',
      CANCEL_REQUEST: 'bg-orange-100 text-orange-700',
      MARKETING_EXPORT: 'bg-purple-100 text-purple-700',
      REJECT_USER: 'bg-red-100 text-red-700',
      REJECT_EQUIPMENT: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[action] || 'bg-gray-100 text-gray-700'}`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const actions = ['all', ...new Set(logs.map((l) => l.action).filter(Boolean))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
      log.targetUserName?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedData = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Audit Logs</h1>
        <p className="text-gray-600">Track all administrative actions for compliance</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Total Actions</p>
          <p className="text-2xl font-bold text-gray-700">{logs.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Verifications</p>
          <p className="text-2xl font-bold text-green-700">
            {logs.filter((l) => l.action?.includes('VERIFY')).length}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">Bans</p>
          <p className="text-2xl font-bold text-red-700">
            {logs.filter((l) => l.action === 'BAN_USER').length}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Force Expires</p>
          <p className="text-2xl font-bold text-orange-700">
            {logs.filter((l) => l.action === 'FORCE_EXPIRE_REQUEST').length}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Exports</p>
          <p className="text-2xl font-bold text-purple-700">
            {logs.filter((l) => l.action === 'MARKETING_EXPORT').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          {actions.map((action) => (
            <option key={action} value={action}>
              {action === 'all' ? 'All Actions' : action.replace(/_/g, ' ')}
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
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No logs found
                </td>
              </tr>
            ) : (
              paginatedData.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {format(log.timestamp, 'MMM d, yyyy h:mm a')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.adminEmail?.split('@')[0] || 'Admin'}
                        </p>
                        <p className="text-xs text-gray-500">{log.adminEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {log.targetUserName ? (
                      <span className="text-sm text-gray-700">{log.targetUserName}</span>
                    ) : log.targetUserId ? (
                      <span className="text-xs text-gray-500">{log.targetUserId.slice(0, 8)}...</span>
                    ) : log.collection ? (
                      <span className="text-xs text-gray-500">{log.collection}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs text-sm text-gray-600">
                      {log.status && (
                        <span className="mr-2 rounded bg-gray-100 px-1 py-0.5 text-xs">
                          Status: {log.status}
                        </span>
                      )}
                      {log.reason && (
                        <span className="text-xs text-gray-500">Reason: {log.reason}</span>
                      )}
                      {log.notes && (
                        <span className="text-xs text-gray-500">Notes: {log.notes}</span>
                      )}
                      {log.recordCount !== undefined && (
                        <span className="text-xs text-gray-500">
                          Records: {log.recordCount}
                        </span>
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
              {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
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
    </div>
  );
}
