'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Camera,
  Calendar,
  Zap,
  ShieldCheck,
  TrendingUp,
  Clock,
  Instagram,
  MapPin,
  Video,
  Briefcase,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
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
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const baseStats = await getDashboardStats();
        
        // Fetch additional stats
        const [
          influencersSnapshot,
          locationsSnapshot,
          videoPromotionsSnapshot,
          workersSnapshot,
          jobsSnapshot,
        ] = await Promise.all([
          getCountFromServer(collection(db, 'influencer_profiles')),
          getCountFromServer(collection(db, 'lease_locations')),
          getCountFromServer(collection(db, 'video_promotions')),
          getCountFromServer(collection(db, 'worker_profiles')),
          getCountFromServer(collection(db, 'jobs')),
        ]);

        setStats({
          ...baseStats,
          influencers: influencersSnapshot.data().count,
          locations: locationsSnapshot.data().count,
          videoPromotions: videoPromotionsSnapshot.data().count,
          workers: workersSnapshot.data().count,
          totalJobs: jobsSnapshot.data().count,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">Welcome to FilmGrid Super Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <div onClick={() => router.push('/dashboard/verification')} className="cursor-pointer">
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={Users}
            color="blue"
          />
        </div>
        <div onClick={() => router.push('/dashboard/equipment')} className="cursor-pointer">
          <StatsCard
            title="Total Equipment"
            value={stats?.totalEquipment || 0}
            icon={Camera}
            color="green"
          />
        </div>
        <div onClick={() => router.push('/dashboard/bookings')} className="cursor-pointer">
          <StatsCard
            title="Total Bookings"
            value={stats?.totalBookings || 0}
            icon={Calendar}
            color="orange"
          />
        </div>
        <div onClick={() => router.push('/dashboard/verification')} className="cursor-pointer">
          <StatsCard
            title="Pending Profiles"
            value={stats?.pendingProfiles || 0}
            icon={ShieldCheck}
            color="red"
          />
        </div>
      </div>

      {/* Second Row */}
      <div className="mb-6 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <div onClick={() => router.push('/dashboard/bookings')} className="cursor-pointer">
          <StatsCard
            title="Active Bookings"
            value={stats?.activeBookings || 0}
            icon={TrendingUp}
            color="purple"
          />
        </div>
        <div onClick={() => router.push('/dashboard/orders')} className="cursor-pointer">
          <StatsCard
            title="Open Orders"
            value={stats?.openOrders || 0}
            icon={Zap}
            color="orange"
          />
        </div>
        <div onClick={() => router.push('/dashboard/equipment')} className="cursor-pointer">
          <StatsCard
            title="Pending Equipment"
            value={stats?.pendingEquipment || 0}
            icon={Clock}
            color="red"
          />
        </div>
        <div onClick={() => router.push('/dashboard/workforce')} className="cursor-pointer">
          <StatsCard
            title="Workers"
            value={stats?.workers || 0}
            icon={Briefcase}
            color="orange"
          />
        </div>
      </div>

      {/* Third Row */}
      <div className="mb-6 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <div onClick={() => router.push('/dashboard/influencers')} className="cursor-pointer">
          <StatsCard
            title="Influencers"
            value={stats?.influencers || 0}
            icon={Instagram}
            color="pink"
          />
        </div>
        <div onClick={() => router.push('/dashboard/locations')} className="cursor-pointer">
          <StatsCard
            title="Lease Locations"
            value={stats?.locations || 0}
            icon={MapPin}
            color="green"
          />
        </div>
        <div onClick={() => router.push('/dashboard/promotions')} className="cursor-pointer">
          <StatsCard
            title="Video Promotions"
            value={stats?.videoPromotions || 0}
            icon={Video}
            color="purple"
          />
        </div>
        <div onClick={() => router.push('/dashboard/jobs')} className="cursor-pointer">
          <StatsCard
            title="Jobs"
            value={stats?.totalJobs || 0}
            icon={Briefcase}
            color="blue"
          />
        </div>
      </div>
    </div>
  );
}
