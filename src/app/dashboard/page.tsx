'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Camera,
  Calendar,
  Zap,
  Instagram,
  MapPin,
  Video,
  Briefcase,
  Image,
  Bell,
  Settings,
  History,
  Trophy,
  Mail,
  Package,
  Store,
  Radio,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { getDashboardStats } from '@/lib/firestore';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardStats } from '@/lib/types';

interface ExtendedStats extends DashboardStats {
  influencers: number;
  locations: number;
  videoPromotions: number;
  workers: number;
  totalJobs: number;
  projects: number;
}

// Color type for cards
type CardColor = 'teal' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'blue' | 'purple' | 'orange' | 'cyan' | 'pink' | 'lime' | 'violet' | 'fuchsia' | 'sky' | 'red' | 'green' | 'yellow' | 'slate';

// Square navigation card component
function NavCard({ 
  title, 
  icon: Icon, 
  href, 
  color,
  count,
}: { 
  title: string; 
  icon: React.ElementType; 
  href: string; 
  color: CardColor;
  count?: number;
}) {
  const router = useRouter();
  
  const colorStyles: Record<CardColor, string> = {
    teal: 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
    rose: 'bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
    cyan: 'bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700',
    pink: 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
    lime: 'bg-gradient-to-br from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700',
    violet: 'bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700',
    fuchsia: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700',
    sky: 'bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
    red: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    green: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    yellow: 'bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
    slate: 'bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700',
  };

  return (
    <div 
      onClick={() => router.push(href)}
      className={`group aspect-square flex flex-col items-center justify-center gap-2 rounded-xl p-4 cursor-pointer transition-all duration-200 text-white shadow-md hover:shadow-lg hover:scale-105 ${colorStyles[color]}`}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium text-center leading-tight">
        {title}
      </span>
      {count !== undefined && (
        <span className="text-lg font-bold">{count}</span>
      )}
    </div>
  );
}

// Section card component - groups related items
function SectionCard({
  title,
  icon: Icon,
  color,
  count,
  items,
}: {
  title: string;
  icon: React.ElementType;
  color: CardColor;
  count?: number;
  items: { title: string; href: string }[];
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const colorStyles: Record<CardColor, { bg: string; text: string; border: string }> = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
    lime: { bg: 'bg-lime-50', text: 'text-lime-600', border: 'border-lime-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
    fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  };

  const styles = colorStyles[color];

  return (
    <div className={`rounded-2xl border-2 ${styles.border} ${styles.bg} overflow-hidden transition-all duration-200 hover:shadow-lg`}>
      {/* Header */}
      <div
        onClick={() => items.length > 1 ? setIsExpanded(!isExpanded) : router.push(items[0]?.href || '#')}
        className="p-6 cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${styles.text} bg-white shadow-sm`}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold ${styles.text}`}>{title}</h3>
            {count !== undefined && (
              <p className="text-3xl font-bold text-gray-900">{count}</p>
            )}
          </div>
          {items.length > 1 && (
            <ArrowRight className={`h-5 w-5 ${styles.text} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </div>
      </div>

      {/* Expandable Items */}
      {isExpanded && items.length > 1 && (
        <div className="border-t border-white/50 bg-white/50">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => router.push(item.href)}
              className="px-4 py-2.5 text-sm text-gray-700 hover:bg-white cursor-pointer flex items-center gap-2 border-b border-gray-100 last:border-b-0"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${styles.text.replace('text-', 'bg-')}`} />
              {item.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!db) {
          console.error('Firestore not initialized');
          setLoading(false);
          return;
        }
        
        const baseStats = await getDashboardStats();
        
        // Fetch counts - handle errors gracefully for collections that may not exist
        let influencersCount = 0;
        let locationsCount = 0;
        let videoPromotionsCount = 0;
        let workersCount = 0;
        let jobsCount = 0;
        let projectsCount = 0;

        try {
          const projectsSnapshot = await getCountFromServer(collection(db, 'projects'));
          projectsCount = projectsSnapshot.data().count;
        } catch (e) { console.log('projects not found'); }

        try {
          const locationsSnapshot = await getCountFromServer(collection(db, 'lease_locations'));
          locationsCount = locationsSnapshot.data().count;
        } catch (e) { console.log('lease_locations not found'); }

        try {
          const videoPromotionsSnapshot = await getCountFromServer(collection(db, 'video_promotions'));
          videoPromotionsCount = videoPromotionsSnapshot.data().count;
        } catch (e) { console.log('video_promotions not found'); }

        try {
          const jobsSnapshot = await getCountFromServer(collection(db, 'jobs'));
          jobsCount = jobsSnapshot.data().count;
        } catch (e) { console.log('jobs not found'); }

        // Count verified workers and influencers from users collection
        try {
          const { query, where, getDocs } = await import('firebase/firestore');
          
          // Count users with workerVerification.status = 'verified'
          const workersQuery = query(
            collection(db, 'users'),
            where('workerVerification.status', '==', 'verified')
          );
          const workersSnapshot = await getDocs(workersQuery);
          workersCount = workersSnapshot.size;

          // Count users with influencerVerification.status = 'verified'
          const influencersQuery = query(
            collection(db, 'users'),
            where('influencerVerification.status', '==', 'verified')
          );
          const influencersSnapshot = await getDocs(influencersQuery);
          influencersCount = influencersSnapshot.size;
        } catch (e) { 
          console.log('Error counting workers/influencers:', e); 
        }

        setStats({
          ...baseStats,
          influencers: influencersCount,
          locations: locationsCount,
          videoPromotions: videoPromotionsCount,
          workers: workersCount,
          totalJobs: jobsCount,
          projects: projectsCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure Firebase is initialized
    const timer = setTimeout(fetchStats, 100);
    return () => clearTimeout(timer);
  }, []);

  // Timeout fallback - show content after 3 seconds even if still loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}!</h1>
        <p className="text-sm text-gray-500">FilmGrid Admin Dashboard</p>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* Users Section Card */}
        <SectionCard
          title="Users"
          icon={Users}
          color="teal"
          count={stats?.totalUsers || 0}
          items={[
            { title: 'All Users', href: '/dashboard/users' },
            { title: `User Projects (${stats?.projects || 0})`, href: '/dashboard/projects' },
          ]}
        />

        {/* Equipment Section Card */}
        <SectionCard
          title="Equipment"
          icon={Camera}
          color="blue"
          count={stats?.totalEquipment || 0}
          items={[
            { title: 'Equipment Catalog', href: '/dashboard/equipment-catalog' },
            { title: 'Store Catalogue', href: '/dashboard/store-catalogue' },
            { title: 'Lender Equipment', href: '/dashboard/equipment' },
            { title: 'Active Bookings', href: '/dashboard/bookings' },
            { title: 'Open Orders', href: '/dashboard/orders' },
            { title: 'Gear Requests', href: '/dashboard/requests' },
            { title: 'Rental Requests', href: '/dashboard/requests' },
          ]}
        />

        {/* Crew Section Card */}
        <SectionCard
          title="Crew"
          icon={Briefcase}
          color="amber"
          count={stats?.workers || 0}
          items={[
            { title: 'Workers', href: '/dashboard/workforce' },
            { title: 'Jobs', href: '/dashboard/jobs' },
          ]}
        />

        {/* Influencers Section Card */}
        <SectionCard
          title="Influencers"
          icon={Instagram}
          color="pink"
          count={stats?.influencers || 0}
          items={[
            { title: 'Influencers', href: '/dashboard/influencers' },
            { title: 'Promotions', href: '/dashboard/promotions' },
          ]}
        />

        {/* Banners Section Card */}
        <SectionCard
          title="Banners"
          icon={Image}
          color="emerald"
          items={[
            { title: 'Manage Banners', href: '/dashboard/banners' },
          ]}
        />

        {/* Lease Locations Section Card */}
        <SectionCard
          title="Lease Locations"
          icon={MapPin}
          color="green"
          count={stats?.locations || 0}
          items={[
            { title: 'All Locations', href: '/dashboard/locations' },
          ]}
        />

        {/* Competitions Section Card */}
        <SectionCard
          title="Competitions"
          icon={Trophy}
          color="yellow"
          items={[
            { title: 'Manage Competitions', href: '/dashboard/competitions' },
          ]}
        />

        {/* Marketing Section Card */}
        <SectionCard
          title="Marketing"
          icon={Mail}
          color="violet"
          items={[
            { title: 'Campaigns', href: '/dashboard/marketing' },
          ]}
        />

        {/* Push Notifications Section Card */}
        <SectionCard
          title="Notifications"
          icon={Bell}
          color="sky"
          items={[
            { title: 'Push Notifications', href: '/dashboard/notifications' },
          ]}
        />

        {/* Audit Logs Section Card */}
        <SectionCard
          title="Audit Logs"
          icon={History}
          color="slate"
          items={[
            { title: 'View Logs', href: '/dashboard/logs' },
          ]}
        />
      </div>
    </div>
  );
}
