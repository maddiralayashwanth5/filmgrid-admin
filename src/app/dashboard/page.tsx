'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
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
  Contact,
  Package,
  Store,
  Radio,
  ArrowRight,
  LayoutDashboard,
  Gift,
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
    teal: { bg: 'bg-teal-900/30', text: 'text-teal-400', border: 'border-teal-700/50' },
    indigo: { bg: 'bg-indigo-900/30', text: 'text-indigo-400', border: 'border-indigo-700/50' },
    amber: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-700/50' },
    rose: { bg: 'bg-rose-900/30', text: 'text-rose-400', border: 'border-rose-700/50' },
    emerald: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700/50' },
    blue: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700/50' },
    purple: { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-700/50' },
    orange: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700/50' },
    cyan: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-700/50' },
    pink: { bg: 'bg-pink-900/30', text: 'text-pink-400', border: 'border-pink-700/50' },
    lime: { bg: 'bg-lime-900/30', text: 'text-lime-400', border: 'border-lime-700/50' },
    violet: { bg: 'bg-violet-900/30', text: 'text-violet-400', border: 'border-violet-700/50' },
    fuchsia: { bg: 'bg-fuchsia-900/30', text: 'text-fuchsia-400', border: 'border-fuchsia-700/50' },
    sky: { bg: 'bg-sky-900/30', text: 'text-sky-400', border: 'border-sky-700/50' },
    red: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700/50' },
    green: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700/50' },
    yellow: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700/50' },
    slate: { bg: 'bg-slate-800/50', text: 'text-slate-400', border: 'border-slate-700/50' },
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
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${styles.text} bg-[#1a1a2e] shadow-sm border border-[#2a2a45]`}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold ${styles.text}`}>{title}</h3>
            {count !== undefined && (
              <p className="text-3xl font-bold text-white">{count}</p>
            )}
          </div>
          {items.length > 1 && (
            <ArrowRight className={`h-5 w-5 ${styles.text} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </div>
      </div>

      {/* Expandable Items */}
      {isExpanded && items.length > 1 && (
        <div className="border-t border-[#2a2a45] bg-[#151525]">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => router.push(item.href)}
              className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a2e] cursor-pointer flex items-center gap-2 border-b border-[#2a2a45] last:border-b-0"
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
  const [splashPhase, setSplashPhase] = useState<'bounce' | 'fadeout' | 'done'>('bounce');
  const [cardsVisible, setCardsVisible] = useState(false);

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

  // Splash animation sequence
  useEffect(() => {
    if (!loading) {
      // Logo bounces in for 1.2s, then fade out for 0.5s
      const fadeTimer = setTimeout(() => setSplashPhase('fadeout'), 1200);
      const doneTimer = setTimeout(() => {
        setSplashPhase('done');
        // Stagger cards after splash
        setTimeout(() => setCardsVisible(true), 100);
      }, 1700);
      return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    }
  }, [loading]);

  if (loading || splashPhase !== 'done') {
    return (
      <>
        <style jsx>{`
          @keyframes bounceInUp {
            0% { opacity: 0; transform: translateY(300px) scale(0.5); }
            40% { opacity: 1; transform: translateY(-30px) scale(1.05); }
            60% { transform: translateY(10px) scale(0.98); }
            80% { transform: translateY(-5px) scale(1.01); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes fadeOut {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.9); }
          }
          .splash-bounce {
            animation: bounceInUp 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
          .splash-fadeout {
            animation: fadeOut 0.5s ease-out forwards;
          }
        `}</style>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f1a]">
          <div className={splashPhase === 'fadeout' ? 'splash-fadeout' : 'splash-bounce'}>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-2xl">
                <NextImage
                  src="/logo.svg"
                  alt="FilmGrid Logo"
                  width={64}
                  height={64}
                />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">FilmGrid</h1>
                <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <style jsx>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Greeting Header */}
      <div style={{
        animation: cardsVisible ? 'fadeInUp 0.6s ease-out forwards' : 'none',
        opacity: 0,
      }}>
        <h1 className="text-2xl font-bold text-white">{greeting}!</h1>
        <p className="text-sm text-gray-400">FilmGrid Admin Dashboard</p>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[
          <SectionCard key="users" title="Users" icon={Users} color="teal" count={stats?.totalUsers || 0}
            items={[{ title: 'All Users', href: '/dashboard/users' }, { title: `User Projects (${stats?.projects || 0})`, href: '/dashboard/projects' }]} />,
          <SectionCard key="equipment" title="Equipment" icon={Camera} color="blue" count={stats?.totalEquipment || 0}
            items={[{ title: 'Equipment Catalog', href: '/dashboard/equipment-catalog' }, { title: 'Store Catalogue', href: '/dashboard/store-catalogue' }, { title: 'Lender Equipment', href: '/dashboard/equipment' }, { title: 'Active Bookings', href: '/dashboard/bookings' }, { title: 'Open Orders', href: '/dashboard/orders' }, { title: 'Gear Requests', href: '/dashboard/requests' }, { title: 'Rental Requests', href: '/dashboard/requests' }]} />,
          <SectionCard key="crew" title="Crew" icon={Briefcase} color="amber" count={stats?.workers || 0}
            items={[{ title: 'Workers', href: '/dashboard/workforce' }, { title: 'Jobs', href: '/dashboard/jobs' }]} />,
          <SectionCard key="influencers" title="Influencers" icon={Instagram} color="pink" count={stats?.influencers || 0}
            items={[{ title: 'Influencers', href: '/dashboard/influencers' }, { title: 'Promotions', href: '/dashboard/promotions' }]} />,
          <SectionCard key="banners" title="Banners" icon={Image} color="emerald"
            items={[{ title: 'Hero Banners', href: '/dashboard/banners' }, { title: 'Equipment Banners', href: '/dashboard/banners/equipment' }, { title: 'Crew Banners', href: '/dashboard/banners/crew' }, { title: 'Popup Banner', href: '/dashboard/popup-banner' }]} />,
          <SectionCard key="locations" title="Lease Locations" icon={MapPin} color="green" count={stats?.locations || 0}
            items={[{ title: 'All Locations', href: '/dashboard/locations' }]} />,
          <SectionCard key="competitions" title="Competitions" icon={Trophy} color="yellow"
            items={[{ title: 'Manage Competitions', href: '/dashboard/competitions' }]} />,
          <SectionCard key="referrals" title="Referrals & Credits" icon={Gift} color="violet"
            items={[{ title: 'Referrals & Credits', href: '/dashboard/referrals' }, { title: 'Synced Contacts', href: '/dashboard/contacts' }]} />,
          <SectionCard key="notifications" title="Notifications" icon={Bell} color="sky"
            items={[{ title: 'Push Notifications', href: '/dashboard/notifications' }]} />,
          <SectionCard key="logs" title="Audit Logs" icon={History} color="slate"
            items={[{ title: 'View Logs', href: '/dashboard/logs' }]} />,
        ].map((card, index) => (
          <div
            key={index}
            style={{
              animation: cardsVisible ? `fadeInUp 0.5s ease-out ${index * 0.08}s forwards` : 'none',
              opacity: 0,
            }}
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
