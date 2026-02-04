'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal' | 'pink' | 'yellow';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const gradientClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600',
  teal: 'from-teal-500 to-teal-600',
  pink: 'from-pink-500 to-pink-600',
  yellow: 'from-amber-500 to-amber-600',
};

const shadowClasses = {
  blue: 'shadow-blue-500/20',
  green: 'shadow-emerald-500/20',
  orange: 'shadow-orange-500/20',
  red: 'shadow-red-500/20',
  purple: 'shadow-purple-500/20',
  teal: 'shadow-teal-500/20',
  pink: 'shadow-pink-500/20',
  yellow: 'shadow-amber-500/20',
};

export default function StatsCard({ title, value, icon: Icon, color, trend }: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Background decoration */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${gradientClasses[color]} opacity-10 blur-2xl transition-all duration-300 group-hover:opacity-20 group-hover:scale-150`} />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          {trend && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${gradientClasses[color]} p-3 shadow-lg ${shadowClasses[color]} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
