'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Users,
  Mail,
  Save,
  RefreshCw,
  Database,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'danger'>('general');

  // General settings
  const [settings, setSettings] = useState({
    siteName: 'FilmGrid',
    supportEmail: 'support@filmgrid.com',
    maxEquipmentPerUser: 50,
    defaultBookingDuration: 7,
    autoExpireOpenOrders: 24,
    requireIdVerification: true,
    allowGuestBrowsing: true,
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNewBooking: true,
    emailBookingCancelled: true,
    emailNewUser: false,
    emailNewEquipment: true,
    emailVerificationRequest: true,
    pushEnabled: true,
  });

  const handleSaveSettings = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage application settings and preferences</p>
      </div>

      {/* Admin Info */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.displayName || 'Admin'}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6 rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">General Settings</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Equipment per User</label>
              <input
                type="number"
                value={settings.maxEquipmentPerUser}
                onChange={(e) => setSettings({ ...settings, maxEquipmentPerUser: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Booking Duration (days)</label>
              <input
                type="number"
                value={settings.defaultBookingDuration}
                onChange={(e) => setSettings({ ...settings, defaultBookingDuration: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Auto-expire Open Orders (hours)</label>
              <input
                type="number"
                value={settings.autoExpireOpenOrders}
                onChange={(e) => setSettings({ ...settings, autoExpireOpenOrders: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <p className="font-medium">Require ID Verification</p>
                <p className="text-sm text-gray-500">Users must verify ID before becoming lenders</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, requireIdVerification: !settings.requireIdVerification })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.requireIdVerification ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.requireIdVerification ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <p className="font-medium">Allow Guest Browsing</p>
                <p className="text-sm text-gray-500">Non-logged in users can browse equipment</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowGuestBrowsing: !settings.allowGuestBrowsing })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.allowGuestBrowsing ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.allowGuestBrowsing ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Notification Settings</h2>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-medium text-gray-700">
              <Mail className="h-4 w-4" /> Email Notifications
            </h3>

            {[
              { key: 'emailNewBooking', label: 'New Booking', desc: 'When a new booking is created' },
              { key: 'emailBookingCancelled', label: 'Booking Cancelled', desc: 'When a booking is cancelled' },
              { key: 'emailNewUser', label: 'New User Registration', desc: 'When a new user signs up' },
              { key: 'emailNewEquipment', label: 'New Equipment Listed', desc: 'When new equipment is listed' },
              { key: 'emailVerificationRequest', label: 'Verification Request', desc: 'When a user requests verification' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      notifications[item.key as keyof typeof notifications] ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}

            <h3 className="mt-6 flex items-center gap-2 font-medium text-gray-700">
              <Bell className="h-4 w-4" /> Push Notifications
            </h3>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <p className="font-medium">Enable Push Notifications</p>
                <p className="text-sm text-gray-500">Receive browser push notifications</p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, pushEnabled: !notifications.pushEnabled })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notifications.pushEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notifications.pushEnabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6 rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Security Settings</h2>

          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4" /> Admin Users
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Authorized admin emails are configured in environment variables.
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 rounded bg-white px-3 py-2 text-sm">
                  <Shield className="h-4 w-4 text-green-500" />
                  yashwanthmaddirala@gmail.com
                </div>
                <div className="flex items-center gap-2 rounded bg-white px-3 py-2 text-sm">
                  <Shield className="h-4 w-4 text-green-500" />
                  cinepro.online@gmail.com
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Session Management</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your current session is active. Sign out from other devices if needed.
              </p>
              <button className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
                Sign Out All Other Sessions
              </button>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Two-Factor Authentication</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add an extra layer of security to your account.
              </p>
              <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {activeTab === 'danger' && (
        <div className="space-y-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </h2>
          <p className="text-sm text-red-600">
            These actions are irreversible. Please proceed with caution.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg bg-white p-4">
              <h3 className="flex items-center gap-2 font-medium text-gray-900">
                <Database className="h-4 w-4" /> Clear Cache
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Clear all cached data. This may temporarily slow down the application.
              </p>
              <button className="mt-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100">
                Clear Cache
              </button>
            </div>

            <div className="rounded-lg bg-white p-4">
              <h3 className="flex items-center gap-2 font-medium text-gray-900">
                <Trash2 className="h-4 w-4" /> Delete All Test Data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Remove all test/seed data from the database. Production data will not be affected.
              </p>
              <button className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
                Delete Test Data
              </button>
            </div>

            <div className="rounded-lg bg-white p-4">
              <h3 className="flex items-center gap-2 font-medium text-gray-900">
                <RefreshCw className="h-4 w-4" /> Re-seed Equipment Data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Re-run the equipment seeding function to refresh demo data.
              </p>
              <button className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100">
                Re-seed Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
