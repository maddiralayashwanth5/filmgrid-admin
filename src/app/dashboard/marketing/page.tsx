'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Download,
  Users,
  Mail,
  Phone,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  CheckCircle,
  Shield,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface MarketingContact {
  uid: string;
  displayName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  location?: string;
  verificationStatus: string;
  marketingConsent: boolean;
  consentTimestamp?: Date;
  createdAt: Date;
}

export default function MarketingPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<MarketingContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [consentFilter, setConsentFilter] = useState<string>('consented');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        uid: doc.id,
        displayName: doc.data().displayName || doc.data().name || '',
        phoneNumber: doc.data().phoneNumber || '',
        email: doc.data().email,
        role: doc.data().role || 'renter',
        location: doc.data().location,
        verificationStatus: doc.data().verificationStatus || 'pending',
        marketingConsent: doc.data().marketingConsent || false,
        consentTimestamp: doc.data().consentTimestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as MarketingContact[];
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phoneNumber?.includes(search) ||
      contact.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || contact.role === roleFilter;
    const matchesVerified =
      verifiedFilter === 'all' ||
      (verifiedFilter === 'verified' && contact.verificationStatus === 'verified') ||
      (verifiedFilter === 'unverified' && contact.verificationStatus !== 'verified');
    const matchesConsent =
      consentFilter === 'all' ||
      (consentFilter === 'consented' && contact.marketingConsent) ||
      (consentFilter === 'not-consented' && !contact.marketingConsent);
    return matchesSearch && matchesRole && matchesVerified && matchesConsent;
  });

  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedData = filteredContacts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportToCSV = async () => {
    if (!user) return;
    
    setExporting(true);
    try {
      // Only export consented contacts
      const exportData = filteredContacts.filter((c) => c.marketingConsent);
      
      if (exportData.length === 0) {
        alert('No contacts with marketing consent to export');
        setExporting(false);
        return;
      }

      // Create CSV
      const headers = ['Name', 'Phone', 'Email', 'Role', 'Location', 'Verified', 'Consent Date'];
      const rows = exportData.map((c) => [
        c.displayName,
        c.phoneNumber,
        c.email || '',
        c.role,
        c.location || '',
        c.verificationStatus === 'verified' ? 'Yes' : 'No',
        c.consentTimestamp ? format(c.consentTimestamp, 'yyyy-MM-dd') : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `filmgrid_marketing_contacts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      // Log export
      await addDoc(collection(db, 'admin_logs'), {
        adminId: user.uid,
        adminEmail: user.email,
        action: 'MARKETING_EXPORT',
        recordCount: exportData.length,
        filters: { roleFilter, verifiedFilter, consentFilter },
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const consentedCount = contacts.filter((c) => c.marketingConsent).length;
  const verifiedCount = contacts.filter((c) => c.verificationStatus === 'verified').length;

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
        <h1 className="text-2xl font-bold text-gray-900">Marketing Contacts</h1>
        <p className="text-gray-600">Export contacts for marketing campaigns (GDPR compliant)</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Users</p>
          <p className="text-2xl font-bold text-blue-700">{contacts.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">Marketing Consent</p>
          <p className="text-2xl font-bold text-green-700">{consentedCount}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Verified Users</p>
          <p className="text-2xl font-bold text-purple-700">{verifiedCount}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-orange-600">Filtered Results</p>
          <p className="text-2xl font-bold text-orange-700">{filteredContacts.length}</p>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-medium text-green-800">GDPR & Play Store Compliance</h3>
            <p className="text-sm text-green-700">
              Only users who have explicitly consented to marketing communications are exportable.
              All exports are logged for audit purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="renter">Renters</option>
          <option value="lender">Lenders</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => {
            setVerifiedFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        >
          <option value="all">All Verification</option>
          <option value="verified">Verified Only</option>
          <option value="unverified">Unverified</option>
        </select>
        <select
          value={consentFilter}
          onChange={(e) => {
            setConsentFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        >
          <option value="all">All Consent Status</option>
          <option value="consented">Consented Only</option>
          <option value="not-consented">Not Consented</option>
        </select>
        <button
          onClick={exportToCSV}
          disabled={exporting || filteredContacts.filter((c) => c.marketingConsent).length === 0}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export CSV ({filteredContacts.filter((c) => c.marketingConsent).length})
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Verified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Consent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              paginatedData.map((contact) => (
                <tr key={contact.uid} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <span className="text-sm font-bold text-green-600">
                          {contact.displayName?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contact.displayName || 'Unknown'}</p>
                        {contact.location && (
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {contact.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Phone className="h-4 w-4" />
                      {contact.phoneNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {contact.email ? (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        contact.role === 'lender'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {contact.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {contact.verificationStatus === 'verified' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" /> Yes
                      </span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {contact.marketingConsent ? (
                      <div>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" /> Yes
                        </span>
                        {contact.consentTimestamp && (
                          <p className="text-xs text-gray-400">
                            {format(contact.consentTimestamp, 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {format(contact.createdAt, 'MMM d, yyyy')}
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
              {Math.min(currentPage * pageSize, filteredContacts.length)} of {filteredContacts.length}
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
