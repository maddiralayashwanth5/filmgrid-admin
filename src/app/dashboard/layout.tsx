'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogOut, 
  Menu, 
  X, 
  Users, 
  Camera, 
  Package, 
  Store, 
  Calendar, 
  Zap, 
  Radio, 
  Briefcase, 
  LayoutDashboard, 
  Instagram, 
  Video, 
  Image as ImageIcon, 
  MapPin, 
  Trophy, 
  Bell, 
  History,
  Home,
  ChevronRight,
  Contact,
  Gift,
  Database,
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { 
    title: 'Users', 
    icon: Users,
    children: [
      { title: 'Users & Verification', href: '/dashboard/users' },
      { title: 'User Projects', href: '/dashboard/projects' },
    ],
  },
  { 
    title: 'Equipment', 
    icon: Camera,
    children: [
      { title: 'Equipment Catalog', href: '/dashboard/equipment-catalog' },
      { title: 'Store Catalogue', href: '/dashboard/store-catalogue' },
      { title: 'Lender Equipment', href: '/dashboard/equipment' },
      { title: 'Active Bookings', href: '/dashboard/bookings' },
      { title: 'Open Orders', href: '/dashboard/orders' },
      { title: 'Gear Requests', href: '/dashboard/requests' },
    ],
  },
  { 
    title: 'Crew', 
    icon: Briefcase,
    children: [
      { title: 'Workers', href: '/dashboard/workforce' },
      { title: 'Jobs', href: '/dashboard/jobs' },
    ],
  },
  { 
    title: 'Influencers', 
    icon: Instagram,
    children: [
      { title: 'Influencers', href: '/dashboard/influencers' },
      { title: 'Promotions', href: '/dashboard/promotions' },
    ],
  },
  { 
    title: 'Banners', 
    icon: ImageIcon,
    children: [
      { title: 'Hero Banners', href: '/dashboard/banners' },
      { title: 'Equipment Banners', href: '/dashboard/banners/equipment' },
      { title: 'Crew Banners', href: '/dashboard/banners/crew' },
      { title: 'Popup Banner', href: '/dashboard/popup-banner' },
    ],
  },
  { title: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { title: 'Competitions', href: '/dashboard/competitions', icon: Trophy },
    { title: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { title: 'Contacts', href: '/dashboard/contacts', icon: Contact },
  { title: 'Referrals & Credits', href: '/dashboard/referrals', icon: Gift },
  { title: 'Audit Logs', href: '/dashboard/logs', icon: History },
  { title: 'Data Management', href: '/dashboard/data-management', icon: Database },
];

const getAdminDisplayName = (email: string | null | undefined): string => {
  if (!email) return 'Admin';
  const adminNames: Record<string, string> = {
    'yashwanthmaddirala@gmail.com': 'Yash',
    'cinepro.online@gmail.com': 'Cinepro',
  };
  return adminNames[email] || 'Admin';
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showContent, setShowContent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading && !showContent) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-3 text-sm text-gray-400">Loading FilmGrid...</p>
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return null;
  }

  const handleNavigation = (href: string) => {
    router.push(href);
    setMenuOpen(false);
  };

  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? null : title);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Floating Hamburger Menu Button */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex items-center justify-center w-12 h-12 rounded-xl bg-[#1a1a2e] shadow-lg hover:bg-[#252540] hover:scale-105 transition-all duration-200 border border-[#2a2a45]"
      >
        <Menu className="h-6 w-6 text-gray-300" />
      </button>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f1a]/90 backdrop-blur-lg border-b border-[#2a2a45]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pl-20">
          <div className="flex h-16 items-center justify-between">
            {/* Logo - clickable to go home with white rounded background */}
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <Image 
                  src="/logo.svg" 
                  alt="FilmGrid Logo" 
                  width={32} 
                  height={32}
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">FilmGrid</h1>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </Link>

            {/* User section */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                  {getAdminDisplayName(user?.email)?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{getAdminDisplayName(user?.email)}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#1a1a2e] shadow-2xl overflow-y-auto border-r border-[#2a2a45]">
            {/* Menu Header */}
            <div className="sticky top-0 bg-[#1a1a2e] border-b border-[#2a2a45] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-lg">
                  <Image 
                    src="/logo.svg" 
                    alt="FilmGrid Logo" 
                    width={28} 
                    height={28}
                  />
                </div>
                <div>
                  <h2 className="font-bold text-white">FilmGrid</h2>
                  <p className="text-xs text-gray-400">Navigation</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#252540]"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? pathname === item.href : item.children?.some(c => pathname === c.href);
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedSection === item.title;

                return (
                  <div key={item.title}>
                    <button
                      onClick={() => hasChildren ? toggleSection(item.title) : handleNavigation(item.href!)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        isActive 
                          ? 'bg-indigo-600/20 text-indigo-400' 
                          : 'text-gray-300 hover:bg-[#252540]'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                      <span className="flex-1 font-medium">{item.title}</span>
                      {hasChildren && (
                        <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </button>

                    {/* Sub-items */}
                    {hasChildren && isExpanded && (
                      <div className="ml-6 mt-1 mb-2 border-l-2 border-[#2a2a45]">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <button
                              key={child.href}
                              onClick={() => handleNavigation(child.href)}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm rounded-r-lg transition-colors ${
                                isChildActive 
                                  ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 -ml-[2px]' 
                                  : 'text-gray-400 hover:bg-[#252540] hover:text-gray-200'
                              }`}
                            >
                              {child.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* User Info at Bottom */}
            <div className="sticky bottom-0 bg-[#1a1a2e] border-t border-[#2a2a45] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                  {user?.displayName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Admin'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
