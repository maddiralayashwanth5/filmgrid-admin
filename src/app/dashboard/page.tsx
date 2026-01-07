'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Camera,
  Calendar,
  Zap,
  ShieldCheck,
  IndianRupee,
  TrendingUp,
  Clock,
  Instagram,
  MapPin,
  Video,
  Briefcase,
  Radio,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { getDashboardStats } from '@/lib/firestore';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardStats } from '@/lib/types';

interface ExtendedStats extends DashboardStats {
  influencers: number;
  locations: number;
  videoPromotions: number;
  workers: number;
  activeGearRequests: number;
  activeRentalRequests: number;
  activeWorkforceRequests: number;
}

export default function DashboardPage() {
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
          gearRequestsSnapshot,
          rentalRequestsSnapshot,
          workforceRequestsSnapshot,
        ] = await Promise.all([
          getCountFromServer(collection(db, 'influencer_profiles')),
          getCountFromServer(collection(db, 'lease_locations')),
          getCountFromServer(collection(db, 'video_promotions')),
          getCountFromServer(collection(db, 'worker_profiles')),
          getCountFromServer(query(collection(db, 'broadcast_gear_requests'), where('status', '==', 'searching'))),
          getCountFromServer(query(collection(db, 'broadcast_rental_requests'), where('status', '==', 'searching'))),
          getCountFromServer(query(collection(db, 'broadcast_workforce_requests'), where('status', '==', 'searching'))),
        ]);

        setStats({
          ...baseStats,
          influencers: influencersSnapshot.data().count,
          locations: locationsSnapshot.data().count,
          videoPromotions: videoPromotionsSnapshot.data().count,
          workers: workersSnapshot.data().count,
          activeGearRequests: gearRequestsSnapshot.data().count,
          activeRentalRequests: rentalRequestsSnapshot.data().count,
          activeWorkforceRequests: workforceRequestsSnapshot.data().count,
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to FilmGrid Super Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Total Equipment"
          value={stats?.totalEquipment || 0}
          icon={Camera}
          color="green"
        />
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings || 0}
          icon={Calendar}
          color="orange"
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={IndianRupee}
          color="teal"
        />
      </div>

      {/* Second Row */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Bookings"
          value={stats?.activeBookings || 0}
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard
          title="Open Orders"
          value={stats?.openOrders || 0}
          icon={Zap}
          color="orange"
        />
        <StatsCard
          title="Pending Equipment"
          value={stats?.pendingEquipment || 0}
          icon={Clock}
          color="red"
        />
        <StatsCard
          title="Pending Profiles"
          value={stats?.pendingProfiles || 0}
          icon={ShieldCheck}
          color="red"
        />
      </div>

      {/* Third Row - New Features */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Influencers"
          value={stats?.influencers || 0}
          icon={Instagram}
          color="pink"
        />
        <StatsCard
          title="Lease Locations"
          value={stats?.locations || 0}
          icon={MapPin}
          color="green"
        />
        <StatsCard
          title="Video Promotions"
          value={stats?.videoPromotions || 0}
          icon={Video}
          color="purple"
        />
        <StatsCard
          title="Workers"
          value={stats?.workers || 0}
          icon={Briefcase}
          color="orange"
        />
      </div>

      {/* Fourth Row - Active Broadcast Requests */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Radio className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Gear Requests</p>
              <p className="text-2xl font-bold text-purple-700">
                {stats?.activeGearRequests || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Radio className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Rental Requests</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats?.activeRentalRequests || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <Radio className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Workforce Requests</p>
              <p className="text-2xl font-bold text-orange-700">
                {stats?.activeWorkforceRequests || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users by Role */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Users by Role</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-600">Renters</p>
            <p className="text-2xl font-bold text-green-700">
              {stats?.usersByRole.renters || 0}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-600">Lenders</p>
            <p className="text-2xl font-bold text-blue-700">
              {stats?.usersByRole.lenders || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
