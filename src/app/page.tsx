'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Redirect immediately after 1 second if still loading
    const timeout = setTimeout(() => {
      router.push('/login');
    }, 1000);

    if (!loading) {
      clearTimeout(timeout);
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }

    return () => clearTimeout(timeout);
  }, [user, loading, router, mounted]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-500">Loading FilmGrid Admin...</p>
      </div>
    </div>
  );
}
