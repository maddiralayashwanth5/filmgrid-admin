'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Camera,
  Calendar,
  Zap,
  ShieldCheck,
  LogOut,
  Settings,
  Instagram,
  MapPin,
  Video,
  Briefcase,
  Radio,
  Mail,
  History,
  Trophy,
  Image,
  Bell,
  Package,
  ChevronDown,
  ChevronRight,
  Store,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const bannerSubItems = [
  { href: '/dashboard/banners', label: 'Hero Banners' },
  { href: '/dashboard/banners/equipment', label: 'Equipment Banners' },
  { href: '/dashboard/banners/crew', label: 'Crew Banners' },
];

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/verification', label: 'Verification', icon: ShieldCheck },
  { href: '/dashboard/equipment-catalog', label: 'Equipment Catalog', icon: Package },
  { href: '/dashboard/store-catalogue', label: 'Store Catalogue', icon: Store },
  { href: '/dashboard/equipment', label: 'Lender Equipment', icon: Camera },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/orders', label: 'Open Orders', icon: Zap },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/requests', label: 'Broadcast Requests', icon: Radio },
  { href: '/dashboard/competitions', label: 'Competitions', icon: Trophy },
  { href: '/dashboard/influencers', label: 'Influencers', icon: Instagram },
  { href: '/dashboard/locations', label: 'Lease Locations', icon: MapPin },
  { href: '/dashboard/promotions', label: 'Video Promotions', icon: Video },
  { href: '/dashboard/workforce', label: 'Workforce', icon: Users },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Mail },
  { href: '/dashboard/notifications', label: 'Push Notifications', icon: Bell },
  { href: '/dashboard/logs', label: 'Audit Logs', icon: History },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [bannersOpen, setBannersOpen] = useState(pathname.includes('/dashboard/banners'));

  const isBannerActive = pathname.includes('/dashboard/banners');

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 text-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">FilmGrid Admin</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === '/dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>

          {/* Banners Dropdown */}
          <div>
            <button
              onClick={() => setBannersOpen(!bannersOpen)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isBannerActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Image className="h-5 w-5" />
                Banners
              </div>
              {bannersOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {bannersOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-4">
                {bannerSubItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other nav items */}
          {navItems.slice(1).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              {user?.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user?.displayName || 'Admin'}</p>
              <p className="truncate text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
