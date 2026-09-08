'use client';

import { useState, useEffect } from 'react';
import FollowerCounter from '@/components/FollowerCounter';
import GrowthCalendar from '@/components/GrowthCalendar';
import Calculators from '@/components/Calculators';
import ProjectionChart from '@/components/ProjectionChart';
import ThemeToggle from '@/components/ThemeToggle';
import ShareMetrics from '@/components/ShareMetrics';
import { brand } from '@/lib/brand';

import Image from 'next/image';

interface DashboardData {
  profile: {
    followers: number;
    fullName?: string;
    profilePicUrl?: string;
  };
  history: { date: string; followers: number; change: number }[];
  lastUpdated?: number;
}

// Module-level cache: survives component remounts (back navigation)
let cachedData: DashboardData | null = null;
let cachedLastFetch: number | null = null;

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<number | null>(cachedLastFetch);

  const username = brand.username;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const showSkeleton = !cachedData;

    const fetchData = async () => {
      try {
        const fetchPromise = fetch('/api/followers').then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        });

        // Skeleton visible for at least 500ms only on first load ever
        const [json] = await Promise.all([
          fetchPromise,
          ...(showSkeleton ? [new Promise(r => setTimeout(r, 500))] : [])
        ]);

        cachedData = json;
        cachedLastFetch = json.lastUpdated || Date.now();
        setData(cachedData);
        setLastFetch(cachedLastFetch);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [username]);

  // Calculate today's change from history
  const getTodayChange = (): number => {
    if (!data?.history || data.history.length === 0) return 0;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    const todayEntry = data.history.find(h => h.date === today);
    return todayEntry?.change || 0;
  };

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <a
          href={`https://instagram.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}
        >
          <Image
            src={brand.headerLogo}
            alt={`${brand.name} Logo`}
            width={50}
            height={50}
            style={{ borderRadius: '8px', transition: 'transform 0.2s ease', objectFit: 'contain' }}
            className="logo-hover"
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {brand.name}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{brand.product}</span>
          </h1>
        </a>
        <ThemeToggle />
      </header>

      <div className="grid" style={{ gap: '2rem' }}>
        {/* Top Section: Counter centered hero */}
        <section>
          <FollowerCounter
            username={username}
            followers={data?.profile?.followers || 0}
            fullName={data?.profile?.fullName}
            profilePicUrl={data?.profile?.profilePicUrl || ''}
            loading={loading && !data}
            todayChange={getTodayChange()}
            lastUpdated={lastFetch || undefined}
          />
        </section>

        {/* Growth + Calculators side by side */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
          <GrowthCalendar history={data?.history || []} loading={loading && !data} />
          <Calculators
            currentFollowers={data?.profile?.followers || 0}
            history={data?.history || []}
            loading={loading && !data}
          />
        </div>

        {/* Projection Chart */}
        <section>
          <ProjectionChart
            currentFollowers={data?.profile?.followers || 0}
            history={data?.history || []}
            loading={loading && !data}
          />
        </section>

        {/* Share Metrics */}
        <section>
          <ShareMetrics
            currentFollowers={data?.profile?.followers || 0}
            history={data?.history || []}
            username={username}
            loading={loading && !data}
          />
        </section>
      </div>

    </main>
  );
}
