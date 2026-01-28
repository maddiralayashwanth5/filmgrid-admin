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

      <aside className={`fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 text-white transition-transform duration-300 lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
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

          {/* Categorized Navigation */}
          {sidebarCategories.map((category) => {
            const isOpen = openCategories[category.id];
            const isActive = isCategoryActive(category);

            return (
              <div key={category.id}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-yellow-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="h-5 w-5" />
                    {category.label}
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-4">
                    {category.items.map((item) => {
                      const isItemActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isItemActive
                              ? 'bg-gray-700 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-gray-700" />

          {/* Banners Dropdown */}
          <div>
            <button
              onClick={() => toggleCategory('banners')}
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
              {openCategories['banners'] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {openCategories['banners'] && (
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
          {otherNavItems.map((item) => {
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
    </>
  );
}
