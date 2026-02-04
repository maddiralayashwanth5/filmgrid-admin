'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Camera,
  Calendar,
  Zap,
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
  UserCheck,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Sidebar category configuration
interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
}

interface NavCategory {
  id: string;
  label: string;
  icon: typeof Users;
  items: NavItem[];
}

const sidebarCategories: NavCategory[] = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    items: [
      { href: '/dashboard/users', label: 'Users & Verification', icon: Users },
    ],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: Camera,
    items: [
      { href: '/dashboard/equipment-catalog', label: 'Equipment Catalog', icon: Package },
      { href: '/dashboard/store-catalogue', label: 'Store Catalogue', icon: Store },
      { href: '/dashboard/equipment', label: 'Lender Equipment', icon: Camera },
      { href: '/dashboard/bookings', label: 'Active Bookings', icon: Calendar },
      { href: '/dashboard/orders', label: 'Open Orders', icon: Zap },
      { href: '/dashboard/requests?type=gear', label: 'Gear Requests', icon: Radio },
      { href: '/dashboard/requests?type=rental', label: 'Rental Requests', icon: Radio },
    ],
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: Briefcase,
    items: [
      { href: '/dashboard/workforce', label: 'Workers', icon: UserCheck },
      { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/dashboard/requests?type=workforce', label: 'Workforce Requests', icon: Radio },
    ],
  },
  {
    id: 'influencers',
    label: 'Influencers',
    icon: Instagram,
    items: [
      { href: '/dashboard/influencers', label: 'Influencers', icon: Instagram },
      { href: '/dashboard/promotions', label: 'Video Promotions', icon: Video },
    ],
  },
];

const bannerSubItems = [
  { href: '/dashboard/banners', label: 'Hero Banners' },
  { href: '/dashboard/banners/equipment', label: 'Equipment Banners' },
  { href: '/dashboard/banners/crew', label: 'Crew Banners' },
];

const otherNavItems = [
  { href: '/dashboard/locations', label: 'Lease Locations', icon: MapPin },
  { href: '/dashboard/competitions', label: 'Competitions', icon: Trophy },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Mail },
  { href: '/dashboard/notifications', label: 'Push Notifications', icon: Bell },
  { href: '/dashboard/logs', label: 'Audit Logs', icon: History },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Initialize open categories based on current path
  const getInitialOpenCategories = () => {
    const open: Record<string, boolean> = {};
    sidebarCategories.forEach((cat) => {
      const isActive = cat.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + '/')
      );
      open[cat.id] = isActive;
    });
    open['banners'] = pathname.includes('/dashboard/banners');
    return open;
  };

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(getInitialOpenCategories);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    );
  };

  const isBannerActive = pathname.includes('/dashboard/banners');

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-gray-900 p-2 text-white lg:hidden"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 z-40 h-screen w-72 bg-slate-900 text-white transition-transform duration-300 ease-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-slate-800/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FilmGrid</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
              pathname === '/dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <LayoutDashboard className={`h-5 w-5 transition-transform duration-200 ${pathname === '/dashboard' ? '' : 'group-hover:scale-110'}`} />
            Dashboard
          </Link>

          {/* Section Label */}
          <div className="mt-6 mb-2 px-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Management</p>
          </div>

          {/* Categorized Navigation */}
          {sidebarCategories.map((category) => {
            const isOpen = openCategories[category.id];
            const isActive = isCategoryActive(category);

            return (
              <div key={category.id} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className={`h-5 w-5 transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`} />
                    {category.label}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-4 space-y-0.5 border-l-2 border-slate-700/50 pl-4 py-1">
                    {category.items.map((item) => {
                      const isItemActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                            isItemActive
                              ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Section Label */}
          <div className="mt-6 mb-2 px-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Content</p>
          </div>

          {/* Banners Dropdown */}
          <div className="space-y-1">
            <button
              onClick={() => toggleCategory('banners')}
              className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isBannerActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Image className={`h-5 w-5 transition-transform duration-200 ${!isBannerActive ? 'group-hover:scale-110' : ''}`} />
                Banners
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openCategories['banners'] ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${openCategories['banners'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="ml-4 space-y-0.5 border-l-2 border-slate-700/50 pl-4 py-1">
                {bannerSubItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Other nav items */}
          {otherNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800/50 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold shadow-lg">
              {user?.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{user?.displayName || 'Admin'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
