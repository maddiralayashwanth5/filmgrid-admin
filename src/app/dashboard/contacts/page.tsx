'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Upload, Download, Phone, UserCheck, UserX, Users, X, Loader2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ContactItem {
  id: string;
  phone: string;
  syncedBy: string;
  syncedByName: string;
  syncedAt: Date;
  source: string;
}

interface RegisteredUser {
  uid: string;
  phone: string;
  displayName: string;
}

// Normalize phone number for comparison
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

// Format phone number for display with consistent +91 prefix
const formatPhoneDisplay = (phone: string): string => {
  const digits = phone.replace(/[^\d]/g, '');
  // If already has 91 prefix (12 digits), format as +91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  // If 10 digits (Indian number without country code), add +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  // If starts with 0 (11 digits), remove 0 and add +91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  // For any other format, just return with + if not present
  return phone.startsWith('+') ? phone : `+${digits}`;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [importing, setImporting] = useState(false);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Fetch synced contacts
  useEffect(() => {
    const q = query(collection(db, 'synced_contacts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          phone: data.phone || '',
          syncedBy: data.syncedBy || '',
          syncedByName: data.syncedByName || '',
          syncedAt: data.syncedAt?.toDate() || new Date(),
          source: data.source || 'device',
        };
      });
      items.sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime());
      setContacts(items);
      setLoading(false);
    }, (error) => {
      console.error('Error loading contacts:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch registered users
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          phone: data.phone || '',
          displayName: data.displayName || '',
        };
      });
      setRegisteredUsers(users);
    });
    return () => unsubscribe();
  }, []);

  // Get unique users who have synced contacts
  const usersWhoSynced = Array.from(new Set(contacts.map(c => c.syncedBy)))
    .filter(uid => uid && uid !== 'admin')
    .map(uid => {
      const user = registeredUsers.find(u => u.uid === uid);
      const contactCount = contacts.filter(c => c.syncedBy === uid).length;
      return {
        uid,
        displayName: user?.displayName || contacts.find(c => c.syncedBy === uid)?.syncedByName || 'Unknown',
        phone: user?.phone || '',
        contactCount,
      };
    })
    .sort((a, b) => b.contactCount - a.contactCount);

  // Create a set of normalized registered phone numbers
  const registeredPhones = new Set(registeredUsers.map(u => normalizePhone(u.phone)));

  // Get contacts synced by selected user
  const selectedUserContacts = selectedUserId
    ? contacts.filter(c => c.syncedBy === selectedUserId)
    : [];

  // Split selected user's contacts into registered and unregistered
  const selectedUserRegistered = selectedUserContacts.filter(c => 
    c.phone && registeredPhones.has(normalizePhone(c.phone))
  );
  const selectedUserUnregistered = selectedUserContacts.filter(c => 
    c.phone && !registeredPhones.has(normalizePhone(c.phone))
  );

  // Apply search and status filter
  const filterContacts = (list: ContactItem[]) => {
    let filtered = list;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(c => c.phone.includes(searchQuery));
    }
    
    // Apply status filter
    if (statusFilter === 'registered') {
      filtered = filtered.filter(c => registeredPhones.has(normalizePhone(c.phone)));
    } else if (statusFilter === 'unregistered') {
      filtered = filtered.filter(c => !registeredPhones.has(normalizePhone(c.phone)));
    }
    
    return filtered;
  };

  const filteredUserContacts = filterContacts(selectedUserContacts);
  const filteredUnregistered = filterContacts(selectedUserUnregistered);

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have a header row and at least one data row');
        setImporting(false);
        return;
      }

      const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('number'));

      if (phoneIdx === -1) {
        alert('CSV must have a "phone" or "number" column');
        setImporting(false);
        return;
      }

      // Get existing phone numbers (normalized) to avoid duplicates
      const existingPhones = new Set(contacts.map(c => normalizePhone(c.phone)));
      
      let count = 0;
      let skipped = 0;
      let batch = writeBatch(db);

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const phone = cols[phoneIdx] || '';

        if (!phone) continue;

        // Skip if phone already exists
        const normalizedPhone = normalizePhone(phone);
        if (existingPhones.has(normalizedPhone)) {
          skipped++;
          continue;
        }
        
        // Add to existing set to avoid duplicates within same import
        existingPhones.add(normalizedPhone);

        const docRef = doc(collection(db, 'synced_contacts'));
        batch.set(docRef, {
          phone,
          syncedBy: 'admin',
          syncedByName: 'Admin (CSV)',
          syncedAt: Timestamp.now(),
          source: 'csv',
        });
        count++;

        if (count % 450 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }

      if (count > 0 && count % 450 !== 0) {
        await batch.commit();
      }

      alert(`Imported ${count} new contact(s). Skipped ${skipped} duplicate(s).`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV');
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleExportExcel = () => {
    const dataToExport = selectedUserId ? selectedUserContacts : contacts;
    const rows = dataToExport.map(c => ({
      'Phone': formatPhoneDisplay(c.phone),
      'Source': c.source,
      'Status': registeredPhones.has(normalizePhone(c.phone)) ? 'Registered' : 'Unregistered',
      'Synced By': c.syncedByName,
      'Synced At': c.syncedAt.toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Referrals');
    
    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Phone
      { wch: 10 }, // Source
      { wch: 12 }, // Status
      { wch: 20 }, // Synced By
      { wch: 12 }, // Synced At
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `filmgrid_referrals_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportUnregistered = () => {
    const dataToExport = selectedUserId ? selectedUserUnregistered : contacts.filter(c => !registeredPhones.has(normalizePhone(c.phone)));
    
    if (dataToExport.length === 0) {
      alert('No unregistered contacts to export');
      return;
    }

    const rows = dataToExport.map(c => ({
      'Phone': formatPhoneDisplay(c.phone),
      'Source': c.source,
      'Synced By': c.syncedByName,
      'Synced At': c.syncedAt.toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unregistered Contacts');
    
    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Phone
      { wch: 10 }, // Source
      { wch: 20 }, // Synced By
      { wch: 12 }, // Synced At
    ];
    worksheet['!cols'] = colWidths;

    const fileName = selectedUserId 
      ? `filmgrid_unregistered_${selectedUser?.displayName || 'user'}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `filmgrid_unregistered_all_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm('This will remove duplicate phone numbers, keeping only the most recent entry for each number. Continue?')) {
      return;
    }

    setRemovingDuplicates(true);
    try {
      // Group contacts by normalized phone number
      const phoneMap = new Map<string, ContactItem[]>();
      
      for (const contact of contacts) {
        const normalized = normalizePhone(contact.phone);
        if (!normalized) continue;
        
        if (!phoneMap.has(normalized)) {
          phoneMap.set(normalized, []);
        }
        phoneMap.get(normalized)!.push(contact);
      }

      // Find duplicates (entries with more than one contact per phone)
      const duplicatesToDelete: string[] = [];
      
      for (const [, contactList] of phoneMap) {
        if (contactList.length > 1) {
          // Sort by syncedAt descending (newest first)
          contactList.sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime());
          // Keep the first (newest), delete the rest
          for (let i = 1; i < contactList.length; i++) {
            duplicatesToDelete.push(contactList[i].id);
          }
        }
      }

      if (duplicatesToDelete.length === 0) {
        alert('No duplicates found!');
        setRemovingDuplicates(false);
        return;
      }

      // Delete duplicates in batches
      let batch = writeBatch(db);
      let count = 0;

      for (const docId of duplicatesToDelete) {
        batch.delete(doc(db, 'synced_contacts', docId));
        count++;

        if (count % 450 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }

      if (count % 450 !== 0) {
        await batch.commit();
      }

      alert(`Successfully removed ${duplicatesToDelete.length} duplicate contacts!`);
    } catch (error) {
      console.error('Error removing duplicates:', error);
      alert('Failed to remove duplicates');
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const selectedUser = usersWhoSynced.find(u => u.uid === selectedUserId);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
          <p className="text-sm text-gray-500">
            {contacts.length} total contacts • {usersWhoSynced.length} users synced
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={csvInputRef}
            onChange={handleCSVImport}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={contacts.length === 0}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={handleExportUnregistered}
            disabled={contacts.length === 0}
            className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Unregistered
          </button>
          <button
            onClick={handleRemoveDuplicates}
            disabled={contacts.length === 0 || removingDuplicates}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {removingDuplicates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {removingDuplicates ? 'Removing...' : 'Remove Duplicates'}
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1: Users Who Synced */}
        <div className="rounded-xl border bg-white">
          <div className="border-b bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-blue-800">Users</h2>
            </div>
            <p className="mt-1 text-xs text-blue-600">{usersWhoSynced.length} users have synced contacts</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {usersWhoSynced.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No users have synced contacts yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {usersWhoSynced.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => setSelectedUserId(selectedUserId === user.uid ? null : user.uid)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      selectedUserId === user.uid
                        ? 'bg-blue-100 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      selectedUserId === user.uid ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <span className="text-sm font-bold">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.contactCount} contacts synced</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Selected User's Contacts */}
        <div className="rounded-xl border bg-white">
          <div className="border-b bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-600" />
                <h2 className="font-semibold text-gray-800">
                  {selectedUser ? `${selectedUser.displayName}'s Contacts` : 'Select a User'}
                </h2>
              </div>
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            {selectedUser && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedUserContacts.length} total • {selectedUserRegistered.length} registered • {selectedUserUnregistered.length} unregistered
              </p>
            )}
          </div>
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search phone numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            {/* Status Filter */}
            <div className="flex gap-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('registered')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'registered'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                Registered
              </button>
              <button
                onClick={() => setStatusFilter('unregistered')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'unregistered'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                Unregistered
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {!selectedUserId ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <Phone className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Select a user to view their synced contacts</p>
              </div>
            ) : filteredUserContacts.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <Phone className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No contacts found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredUserContacts.map((contact) => {
                  const isRegistered = registeredPhones.has(normalizePhone(contact.phone));
                  return (
                    <div key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        isRegistered ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        <Phone className={`h-3.5 w-3.5 ${isRegistered ? 'text-green-600' : 'text-orange-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{formatPhoneDisplay(contact.phone)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isRegistered ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isRegistered ? 'Registered' : 'New'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Unregistered Contacts */}
        <div className="rounded-xl border bg-white">
          <div className="border-b bg-orange-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-600" />
              <h2 className="font-semibold text-orange-800">Unregistered</h2>
            </div>
            <p className="mt-1 text-xs text-orange-600">
              {selectedUserId 
                ? `${filteredUnregistered.length} potential new users from ${selectedUser?.displayName}`
                : 'Select a user to filter'
              }
            </p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {!selectedUserId ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <UserX className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Select a user to see their unregistered contacts</p>
              </div>
            ) : filteredUnregistered.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <UserCheck className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-400" />
                <p className="text-sm">All contacts are registered!</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredUnregistered.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                      <Phone className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{formatPhoneDisplay(contact.phone)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
